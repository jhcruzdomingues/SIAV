import { state } from '../config/state.js';
import { supabase } from '../config/supabase.js';
import { formatTime } from '../utils/formatters.js';
import { showScreen, closeModal, openModal, showTransientAlert } from '../ui/dom.js';

export function showNotesModal() {
    openModal('notes-modal');
}

export function saveNotes() {
    try {
        const notesInput = document.getElementById('clinical-notes');
        if (!notesInput) {
            showTransientAlert('Erro: Campo de anotações não encontrado.', 'danger');
            return;
        }
        const notes = notesInput.value || '';
        const sanitizedNotes = notes.trim().replace(/[<>]/g, '');

        if (!sanitizedNotes) { showTransientAlert('Digite alguma anotação antes de salvar.', 'warning'); return; }
        if (sanitizedNotes.length > 5000) { showTransientAlert('Anotação muito longa! Máximo de 5000 caracteres.', 'warning'); return; }

        if (typeof window.checkAccess === 'function' && !window.checkAccess('notes_logging', false)) {
            if (confirm("Anotacoes salvas temporariamente na sessao. Faca upgrade para o Plano Profissional para salvar no log permanente.\n\nDeseja ver os planos disponíveis?")) {
                if (typeof window.openPlansModal === 'function') window.openPlansModal();
            }
            closeModal('notes-modal');
            notesInput.value = '';
            return;
        }

        state.notes.push({ text: sanitizedNotes, time: new Date() });
        if (typeof window.addEvent === 'function') window.addEvent(`ANOTACAO CLINICA: ${sanitizedNotes}`, 'normal');
        
        closeModal('notes-modal');
        notesInput.value = '';
        showTransientAlert('Anotações salvas com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar anotações:', error);
        showTransientAlert('Erro ao salvar anotações. Por favor, tente novamente.', 'danger');
    }
}

export async function savePcrLogToSupabase(logEntry) {
    try {
        if (!state.currentUser.isLoggedIn) {
            console.warn("Tentativa de salvar log sem usuario logado.");
            return { success: false, message: "Usuario nao logado." };
        }

        const userPlan = (state.currentUser?.plan || 'free').toLowerCase();
        let logLimit;
        if (userPlan === 'free') { logLimit = 1; } 
        else if (userPlan === 'student' || userPlan === 'estudante') { logLimit = 5; } 
        else if (userPlan === 'professional' || userPlan === 'profissional' || userPlan === 'lifetime' || userPlan === 'vitalicio') { logLimit = null; } 
        else { logLimit = 1; }

        if (logLimit !== null) {
            const { count, error: countError } = await supabase.from('pcr_logs').select('*', { count: 'exact', head: true }).eq('user_id', state.currentUser.id);
            if (!countError && count >= logLimit) {
                const { data: oldestLog, error: fetchError } = await supabase.from('pcr_logs').select('id, created_at, patient_name').eq('user_id', state.currentUser.id).order('created_at', { ascending: true }).limit(1).single();
                if (!fetchError && oldestLog) {
                    const confirmMsg = `Você atingiu o limite de ${logLimit} log(s) salvos do plano ${userPlan === 'free' ? 'Gratuito' : 'Estudante'}.\n\nPara salvar este novo atendimento, deseja excluir o log mais antigo?\n\nLog mais antigo:\n- Paciente: ${oldestLog.patient_name || 'N/I'}\n- Data: ${new Date(oldestLog.created_at).toLocaleString('pt-BR')}\n\nConfirmar exclusão e salvar novo log?`;
                    if (!confirm(confirmMsg)) {
                        if (confirm('Deseja fazer upgrade para salvar mais logs sem limites?')) {
                            if (typeof window.openPlansModal === 'function') window.openPlansModal();
                        }
                        return { success: false, message: 'Salvamento cancelado pelo usuário.' };
                    }
                    await supabase.from('pcr_logs').delete().eq('id', oldestLog.id);
                }
            }
        }

        if (!logEntry || typeof logEntry !== 'object') return { success: false, message: "Dados invalidos." };
        if (!logEntry.startTime) return { success: false, message: "Hora inicio obrigatoria." };

        const logData = {
            user_id: state.currentUser.id,
            patient_name: logEntry.patientName || 'N/I',
            patient_age: logEntry.patientAge || null,
            patient_weight: logEntry.patientWeight || null,
            patient_sex: logEntry.patientSex || '',
            patient_allergies: logEntry.patientAllergies || '',
            patient_comorbidities: logEntry.patientComorbidities || '',
            rhythm: logEntry.rhythm || '',
            duration_seconds: logEntry.durationSeconds || 0,
            shock_count: logEntry.shocks || 0,
            rosc_achieved: logEntry.roscAchieved || false,
            time_to_first_shock: logEntry.timeToFirstShock || null,
            timeline: logEntry.timeline || null,
            notes: logEntry.notes || '',
            created_at: new Date().toISOString(),
            compression_duration_seconds: logEntry.compressionTime || 0,
            meds_count: logEntry.meds || 0,
            report_html: logEntry.evolutionText || '',
            cycle_count: logEntry.cycleCount || null,
            drugs_administered: logEntry.drugsAdministered || null,
            events: logEntry.events || null,
            evolution_text: logEntry.evolutionText || '',
            patient_id: logEntry.patientId || '',
            outcome: logEntry.outcome || '',
            end_time: logEntry.endTime || null,
            start_time: logEntry.startTime ? new Date(logEntry.startTime).toISOString() : null,
            updated_at: new Date().toISOString(),
            created_by: state.currentUser.id || null,
            device_id: logEntry.deviceId || '',
            location: logEntry.location || '',
            custom_fields: logEntry.customFields || null
        };

        const { data, error } = await supabase.from('pcr_logs').insert([logData]).select();
        if (error) {
            if (!navigator.onLine && window.SIAV && typeof window.SIAV.saveOfflineLog === 'function') {
                window.SIAV.saveOfflineLog(logData);
                showTransientAlert('Offline: atendimento salvo localmente e será sincronizado quando houver internet.', 'warning', 7000);
                return { success: true, offline: true };
            }
            throw error;
        }
        alert('Atendimento salvo com sucesso no seu Historico Online!');
        return { success: true };
    } catch (error) {
        console.error("Erro ao salvar log online:", error);
        alert(`Erro ao salvar log online: ${error.message}`);
        return { success: false, message: error.message };
    }
}

export async function fetchPcrLogs() {
    if (!state.currentUser.isLoggedIn) {
        state.patientLog = [];
        return;
    }
    try {
        const { data, error } = await supabase.from('pcr_logs').select('*').eq('user_id', state.currentUser.id).order('created_at', { ascending: false });
        if (error) throw error;
        state.patientLog = data.map(log => ({
            id: log.id, 
            time: new Date(log.created_at),
            startTime: new Date(log.start_time).getTime(),
            patientName: log.patient_name,
            duration: formatTime(log.duration_seconds),
            evolutionText: log.report_html, 
            shocks: log.shocks_count,
            meds: log.meds_count,
            compressionTime: log.compression_duration_seconds,
            roscAchieved: log.rosc_achieved,
            durationSeconds: log.duration_seconds
        }));
    } catch (error) {
        console.error("Erro ao carregar logs do Supabase:", error.message);
        state.patientLog = [];
    }
}

export async function deleteLogEntry(logId) {
    if (!state.currentUser.isLoggedIn) {
        alert("Você precisa estar logado para excluir registros.");
        if (typeof window.showProfileModal === 'function') window.showProfileModal();
        return;
    }
    if (!confirm(`Tem certeza que deseja EXCLUIR este registro? Esta ação é irreversível.`)) return;
    try {
        const { error } = await supabase.from('pcr_logs').delete().eq('id', logId).eq('user_id', state.currentUser.id);
        if (error) throw error;
        alert(`✅ Registro excluído com sucesso do seu histórico online.`);
        await renderPatientLog(); 
        if (typeof window.updateDashboard === 'function') window.updateDashboard();
    } catch (error) {
        alert(`❌ Erro ao excluir log: ${error.message}`);
        console.error("Erro DELETE Supabase:", error);
    }
}

export function generateEvolution(saveLog) {
    const totalDurationSeconds = state.pcrSeconds;
    const patientName = state.patient.name;
    const shocksCount = state.shockCount;
    const medsList = state.medications.map(m => `${m.name} (${m.dose} via ${m.route})`).join('; ');
    const compressionDuration = state.totalCompressionSeconds;
    const compressionRatio = totalDurationSeconds > 0 ? ((compressionDuration / totalDurationSeconds) * 100).toFixed(1) : 0;
    
    const firstShockEvent = state.events.find(e => e.text.includes('CHOQUE'));
    const firstShockTime = firstShockEvent ? firstShockEvent.time : 'N/A';
    const firstShockEnergy = firstShockEvent ? firstShockEvent.text.match(/(\d+)J/)?.[1] || 'N/A' : 'N/A';
    const firstAdrenalineTime = state.events.find(e => e.text.includes('Adrenalina'))?.time || 'N/A';
    const finalRhythm = state.rhythms[state.rhythms.length - 1]?.name || 'Não Registrado';
    
    const chronologicalEvents = state.events.slice().reverse().map(event => ({ time: event.time, action: event.text.trim() }));
    const logEvents = chronologicalEvents.map(e => `<li>[${e.time}] ${e.action}</li>`).join('');

    const reportHTML = `
        <div class="report-container">
            <button onclick="closeModal('log-detail-modal'); showScreen('home')" class="back-button">← Retornar ao Menu Principal</button>
            <h2 style="text-align: center; border-bottom: 2px solid var(--secondary);">RELATÓRIO DE ATENDIMENTO SIAV - VALIDADE JURÍDICA</h2>
            <p><strong>Número do Atendimento:</strong> ${state.patientLog.length + 1} (Registro provisório)</p>
            <p><strong>Data/Hora de Início:</strong> ${new Date(state.pcrStartTime).toLocaleString('pt-BR')}</p>
            <p><strong>Profissional Responsável:</strong> ${state.currentUser.name} (${state.currentUser.profession || 'N/I'})</p>
            
            <h3 style="margin-top: 20px;">DADOS DO PACIENTE</h3>
            <ul>
                <li>Nome/ID: ${patientName}</li>
                <li>Idade: ${state.patient.age} anos | Peso: ${state.patient.weight} kg</li>
                <li>Comorbidades: ${state.patient.comorbidities}</li>
                <li>Alergias: <span style="font-weight: 700; color: ${state.patient.allergies !== 'Nenhuma informada' && state.patient.allergies !== 'N/I' ? 'var(--danger)' : 'inherit'};">${state.patient.allergies}</span></li>
            </ul>

            <h3 style="margin-top: 20px;">RESUMO ANALÍTICO DE PERFORMANCE (AHA)</h3>
            <ul>
                <li><strong>Desfecho Final:</strong> ${state.roscAchieved ? 'ROSC ALCANÇADO' : 'PCR NÃO REVERTIDA'}</li>
                <li><strong>Duração Total do Atendimento:</strong> ${formatTime(totalDurationSeconds)}</li>
                <li><strong>Tempo de Compressão Ativa (Hands-on Time):</strong> ${formatTime(compressionDuration)} (${compressionRatio}% do Tempo Total)</li>
                <li><strong>Choques Administrados:</strong> ${shocksCount} (1º Choque em: ${firstShockTime}, ${firstShockEnergy}J)</li>
                <li><strong>Primeira Adrenalina:</strong> ${firstAdrenalineTime}</li>
                <li><strong>Ritmo Final Registrado:</strong> ${finalRhythm}</li>
            </ul>

            <h3 style="margin-top: 20px;">DETALHES CRONOLÓGICOS DO EVENTO (Log)</h3>
            <ol class="log-list">${logEvents}</ol>

            <h3 style="margin-top: 20px;">ANOTAÇÕES E MEDICAMENTOS</h3>
            <ul>
                <li>Medicamentos Aplicados: ${medsList || 'Nenhum'}</li>
                <li>Anotações Clínicas Extras: ${state.notes.map(n => n.text).join('; ') || 'Nenhuma'}</li>
            </ul>
            <p style="margin-top: 30px; font-style: italic; border-top: 1px solid #ccc; padding-top: 10px; font-size: 0.85em;">Este documento é uma transcrição técnica das ações registradas no Sistema SIAV, em conformidade com as diretrizes ACLS/AHA.</p>
        </div>
    `;

    if (saveLog) {
        const logEntry = { patientName: patientName, startTime: state.pcrStartTime, durationSeconds: totalDurationSeconds, roscAchieved: state.roscAchieved, shocks: shocksCount, meds: state.medications.length, compressionTime: compressionDuration, evolutionText: reportHTML, report_html: reportHTML, notes: reportHTML };
        savePcrLogToSupabase(logEntry).then(result => {
            if (result.success && typeof window.updateDashboard === 'function') window.updateDashboard();
        });
    }
    showScreen('home');
}

export function renderPatientLog() {
    if (!state.currentUser || !state.currentUser.plan) {
        setTimeout(renderPatientLog, 200);
        return;
    }
    const logList = document.getElementById('patient-log-list');
    if (!logList) return;
    
    logList.innerHTML = '<p style="text-align: center;">Carregando Histórico Online...</p>';

    if (!state.currentUser.isLoggedIn) {
        logList.innerHTML = `<div style="text-align: center; padding: 20px;"><p style="color: var(--danger); font-weight: 700; margin-bottom: 15px;">Faça login para acessar o histórico.</p><button onclick="showProfileModal()" class="primary-btn">Fazer Login</button></div>`;
        return;
    }

    fetchPcrLogs().then(() => {
        if (state.patientLog.length === 0) {
            logList.innerHTML = '<p style="text-align: center; color: #666;">Nenhum atendimento salvo no seu histórico online.</p>';
            return;
        }
        logList.innerHTML = '';
        state.patientLog.forEach(logItem => {
            const itemElement = document.createElement('div');
            itemElement.className = 'log-item';
            itemElement.setAttribute('data-log-id', logItem.id);
            const patientName = logItem.patientName && logItem.patientName !== 'N/I' ? logItem.patientName : `Paciente N/I`;
            const dateString = logItem.time instanceof Date ? logItem.time.toLocaleDateString('pt-BR') : 'N/A';
            const timeString = logItem.time instanceof Date ? logItem.time.toLocaleTimeString('pt-BR') : 'N/A';
            itemElement.innerHTML = `<div class="log-summary"><span>${patientName}</span><span style="color: var(--primary);">${logItem.duration}</span></div><div class="log-details"><span class="log-date">Data: ${dateString} ${timeString}</span><span class="log-duration">Choques: ${logItem.shocks || 0}</span><button class="delete-log-btn" data-id="${logItem.id}">🗑️ Excluir</button></div>`;
            logList.appendChild(itemElement);
        });
        document.querySelectorAll('.delete-log-btn').forEach(button => { button.addEventListener('click', function(e) { e.stopPropagation(); deleteLogEntry(this.getAttribute('data-id')); }); });
        document.querySelectorAll('.log-item').forEach(item => { item.addEventListener('click', function() { viewLogDetail(this.getAttribute('data-log-id')); }); });
    }).catch(() => {
        logList.innerHTML = '<p style="text-align: center; color: var(--danger); font-weight: 700;">Erro ao carregar histórico.</p>';
    });
}

export function viewLogDetail(logId) {
    const logItem = state.patientLog.find(item => String(item.id) === String(logId));
    if (!logItem) { alert('Registro não encontrado!'); return; }
    const detailId = document.getElementById('log-detail-id');
    const detailContent = document.getElementById('log-detail-content');
    if (detailId) detailId.textContent = logId.substring(0, 8);
    const report = logItem.evolutionText || logItem.report_html || logItem.evolution_text || logItem.notes || '<em>Sem relatório detalhado.</em>';
    if (detailContent) detailContent.innerHTML = report;
    openModal('log-detail-modal');
}