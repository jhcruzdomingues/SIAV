import { state } from '../config/state.js';
import { checkAccess } from '../services/permissions.js';

export const HTS_INSTRUCTIONS = {
    "Hipovolemia": { instruction: "Reconhecimento: Pulso fraco/ausente, colapso de veias, histórico de hemorragia. Ação: Reposição rápida de volume com cristaloides ou sangue. Controlar foco de sangramento.", action_short: "Reposição rápida de fluidos IV/IO e controle de sangramento.", icon: '🩸' },
    "Hipóxia": { instruction: "Reconhecimento: Cianose, SpO2 baixa, via aérea inadequada. Ação: Garantir via aérea, ventilar com 100% O₂, confirmar posição de tubo e ventilação adequada.", action_short: "Ventilação com 100% O₂ e garantia da via aérea.", icon: '🌬️' },
    "Hidrogênio": { instruction: "Reconhecimento: Acidose Metabólica (pH baixo). Ação: Melhorar ventilação e oxigenação. Considerar Bicarbonato de Sódio apenas se PCR prolongada, refratária ou hipercalemia.", action_short: "Otimizar ventilação e considerar Bicarbonato de Sódio.", icon: '🧪' },
    "Hipo/Hiper": { instruction: "Hipocalemia: Ondas U, T achadas. Ação: Administração cautelosa de KCl. Hipercalemia: Ondas T apiculadas. Ação: Proteger o coração (CaCl/Gluconato de Ca), Bicarbonato, Insulina/Glicose.", action_short: "Administrar Cálcio para HiperK ou KCl para HipoK.", icon: '⚖️' },
    "Hipotermia": { instruction: "Reconhecimento: Temperatura central < 30°C. Ação: Aquecimento ativo do paciente com fluidos aquecidos, cobertores. Paciente não está morto até estar quente e morto.", action_short: "Aquecimento ativo imediato (fluidos e cobertores).", icon: '🧊' },
    "Tamponamento": { instruction: "Reconhecimento: Tríade de Beck (Hipotensão, turgência jugular, abafamento de bulhas). Ação: Realizar Pericardiocentese de emergência.", action_short: "Pericardiocentese de emergência.", icon: '🫀' },
    "Tensão": { instruction: "Reconhecimento: Desvio de traqueia, turgência jugular, ausência de murmúrio. Ação: Descompressão com agulha (toracocentese de alívio) ou drenagem torácica.", action_short: "Descompressão com agulha (toracocentese de alívio).", icon: '🎈' },
    "Trombose": { instruction: "Coronária (IAM): Ação: Fibrinolítico (se indicado) ou Angioplastia Coronária (PCI). Pulmonar (TEP): Ação: Trombólise ou Embolectomia.", action_short: "Fibrinolíticos ou intervenção percutânea (PCI/Embolectomia).", icon: ' clots' },
    "Tóxicos": { instruction: "Reconhecimento: Sinais toxicológicos específicos, histórico de ingestão. Ação: Administração de antídotos (se conhecidos) e suporte hemodinâmico prolongado.", action_short: "Administrar antídotos específicos e suporte.", icon: '🍄' },
    "Trauma": { instruction: "Reconhecimento: Evidência de lesão externa ou interna grave. Ação: Identificar e tratar o foco (ex: cirurgia, infusão de sangue, controle de via aérea).", action_short: "Identificar e corrigir lesões traumáticas (ex: cirurgia, infusão de sangue).", icon: '🩹' }
};

export const PROTOCOLS = {
    'pcr-adulto': { title: "Fluxograma PCR Adulto (Ritmos Chocáveis vs. Não Chocáveis)", content: `<div class="flow-step-critical">1. INICIAR SBV / RCP de Alta Qualidade</div><div class="flow-connector">ACLS - Conecte o Monitor/Desfibrilador</div><div class="flow-step decision">2. RITMO NO MONITOR? (FV ou TVSP)</div><div class="flow-split"><div><div class="flow-step shockable">SIM (FV ou TVSP)</div><div class="flow-connector">CHOQUE! (energia bifásica recomendada — ex.: 120–200 J; usar 200 J se desconhecido)</div><div class="flow-step">3. RCP por 2 min</div><div class="flow-step medication">Dose: 1 mg EV/IO - administrar agora. Repetir a cada 3-5 min.</div><div class="flow-connector">Reavaliar Ritmo após 2 min</div><div class="flow-step decision">4. CHOQUE 2 INDICADO?</div><div class="flow-connector">SIM</div><div class="flow-step shockable">CHOQUE 2</div><div class="flow-step">5. RCP por 2 min</div><div class="flow-step medication-critical">Se FV/TVSP persistente após 2 choques: Amiodarona 300 mg IV/IO (bolus). Alternativa: Lidocaína</div><div class="flow-connector">Reavaliar Ritmo após 2 min</div></div><div><div class="flow-step non-shockable">NÃO (AESP ou Assistolia)</div><div class="flow-connector">IMEDIATO: Adrenalina + RCP</div><div class="flow-step">3. RCP por 2 min</div><div class="flow-step medication-critical">Dose: 1 mg EV/IO - administrar agora. Repetir a cada 3-5 min.</div><div class="flow-connector">Considere Via Aérea Avançada e ETCO2</div><div class="flow-step non-shockable">4. Reavaliar Ritmo a cada 2 min</div><div class="flow-step decision">Identificar e Tratar 5 H's e 5 T's</div><div class="flow-connector">Se FV/TVSP no ciclo, ir para o lado esquerdo</div></div></div><div class="flow-step rosc">5. ROSC OBTIDO? (Retorno à Circulação)</div><div class="flow-step-critical">6. CUIDADOS PÓS-PCR: Suporte hemodinâmico, TTM, ICP</div>` },
    'pcr-pediatrica': { title: "Fluxograma PCR Pediátrica (PALS)", content: `<div class="flow-step-critical">1. SBV/RCP Pediátrica (C:V 15:2 com 2 socorristas)</div><div class="flow-connector">PALS - Conecte o Monitor/Desfibrilador</div><div class="flow-step decision">2. RITMO CHOCÁVEL? (FV ou TVSP)</div><div class="flow-split"><div><div class="flow-step shockable">SIM (FV ou TVSP)</div><div class="flow-connector">CHOQUE! 1ª Dose: 2 J/kg</div><div class="flow-step">3. RCP por 2 min</div><div class="flow-step medication">Adrenalina 0.01mg/kg (a cada 3-5 min)</div><div class="flow-connector">Reavaliar Ritmo</div><div class="flow-step shockable">4. CHOQUE 2: 4 J/kg</div><div class="flow-step">RCP por 2 min</div><div class="flow-step medication-critical">Amiodarona 5mg/kg ou Lidocaína</div></div><div><div class="flow-step non-shockable">NÃO (AESP ou Assistolia)</div><div class="flow-connector">IMEDIATO: Adrenalina + RCP</div><div class="flow-step">3. RCP por 2 min</div><div class="flow-step medication-critical">Adrenalina 0.01mg/kg (a cada 3-5 min)</div><div class="flow-connector">Acesso EV/IO e Via Aérea Avançada</div><div class="flow-step decision">Tratar Causas Reversíveis Pediátricas</div><div class="flow-step non-shockable">4. Reavaliar Ritmo a cada 2 min</div></div></div><div class="flow-step rosc">5. ROSC OBTIDO?</div>` },
    'avc': { title: "Protocolo para AVC Agudo (Acidente Vascular Cerebral)", content: `<div class="flow-step-critical">1. PRÉ-HOSPITALAR: **Escala de Cincinnati**. Ativação de Alerta.</div><div class="flow-connector">ESCALA DE CINCINNATI: Queda Facial (face), Queda do Braço (braços), Fala Anormal (fala). UM ponto indica alta chance de AVC.</div><div class="flow-step">2. AVALIAÇÃO HOSPITALAR: ABCs, Glicemia, NIHSS, TC/RM de Crânio. (Meta: TC em 25 min)</div><div class="flow-connector">Resultado da Imagem</div><div class="flow-step decision">3. HEMORRAGIA EXCLUÍDA E TEMPO < 4,5 horas?</div><div class="flow-split"><div><div class="flow-step rosc">SIM - AVC ISQUÊMICO (ELEGÍVEL)</div><div class="flow-connector">Meta: Porta-Agulha (Trombólise) em 60 min</div><div class="flow-step medication-critical">4. TROMBÓLISE/ALTEPLASE</div><div class="flow-step">5. Monitoramento intensivo de Pressão Arterial. Considerar Trombectomia Mecânica (até 24h).</div></div><div><div class="flow-step non-shockable">NÃO (Hemorragia Confirmada ou Tempo > 4,5h)</div><div class="flow-connector">SUPORTE CLÍNICO</div><div class="flow-step medication">4. Controle Rigoroso de PA. Suporte hemodinâmico.</div><div class="flow-step">Manutenção da Glicemia, Temperatura. Prevenção de Complicações.</div></div></div>` },
    'iam': { title: "Protocolo para Síndrome Coronariana Aguda (SCA)", content: `<div class="flow-step-critical">1. SUSPEITA DE SCA: Dor torácica. (Meta: ECG em 10 min)</div><div class="flow-connector">AVALIAÇÃO: Sinais Vitais, Linha Venosa, Troponinas</div><div class="flow-step decision">2. ECG MOSTRA SUPRADESNIVELAMENTO ST?</div><div class="flow-split"><div><div class="flow-step shockable">SIM (Infarto com Supra de ST)</div><div class="flow-connector">REPERFUSÃO URGENTE!</div><div class="flow-step medication-critical">Meta: Porta-Balão (Intervenção Coronariana Percutânea) < 90 min ou Fibrinolítico < 30 min.</div><div class="flow-step medication">3. Fármacos: AAS, P2Y12, Anticoagulação. Nitratos e Morfina (se dor).</div></div><div><div class="flow-step non-shockable">NÃO (Infarto Sem Supra de ST / Angina Instável)</div><div class="flow-connector">ESTRATIFICAÇÃO DE RISCO</div><div class="flow-step decision">3. Risco Alto?</div><div class="flow-step medication">Fármacos (AAS, P2Y12, Heparina). Tratar clinicamente e considerar Cateterismo (24-72h).</div></div></div><div class="flow-step-secondary">4. Continuação: Manejo da dor, reabilitação cardíaca.</div>` }
};

export const STUDY_GUIDES = {
    'ecg-ritmos-pcr': { title: "Interpretação de ECG: Ritmos de Parada Cardíaca", sections: [{ heading: "Fibrilação Ventricular (FV)", content: "Ritmo caótico e irregular, sem ondas P, QRS ou T identificáveis. É um ritmo chocável. A ação imediata é **Desfibrilação**." }, { heading: "Taquicardia Ventricular sem Pulso (TVSP)", content: "Ondas QRS largas e rápidas, ritmo regular, mas sem pulso detectável. É um ritmo chocável. Ação imediata é **Desfibrilação**." }, { heading: "Atividade Elétrica Sem Pulso (AESP)", content: "Qualquer ritmo organizado (como sinusal, bradicardia ou taquicardia) no monitor de ECG, mas sem pulso detectável no paciente. Não é chocável. Ação: **RCP de alta qualidade + Adrenalina + Identificar 5 H's e 5 T's**." }, { heading: "Assistolia", content: "Linha reta ou com mínimas ondulações. Ação: **Confirmar em mais de uma derivação**. Não é chocável. A ação é **RCP de alta qualidade + Adrenalina + Identificar 5 H's e 5 T's**." }] },
    'ecg-interpretacao': { title: "Interpretação Básica e Avançada do ECG", sections: [{ heading: "Guia dos 5 Passos (Ritmo Sinusal)", content: "1. Frequência (60-100 bpm). 2. Ritmo (Regular). 3. Onda P (Presente, seguida por QRS). 4. Intervalo PR (Normal, 0.12-0.20s). 5. Complexo QRS (Estreito, < 0.12s)." }, { heading: "Análise de Isquemia e Infarto", content: "O achado mais crítico na emergência é o **Supradesnivelamento do Segmento ST** (Infarto Agudo com Supra de ST - IAMCSST), que exige a ativação imediata do protocolo de reperfusão (Angioplastia ou Trombólise)." }, { heading: "Eixo Cardíaco", content: "Determinar o Eixo (Normal, Desvio para Esquerda ou Direita) é importante para identificar bloqueios ou hipertrofias. <br>Regra Rápida: QRS positivo em D1 e aVF = Eixo Normal." }] },
    'farmacologia': { title: "Farmacologia Emergencial Chave (Adulto)", sections: [{ heading: "Adrenalina (Epinefrina)", content: "<strong>Indicação:</strong> Todos os ritmos de PCR (chocáveis e não-chocáveis). <strong>Dose:</strong> 1 mg EV/IO a cada 3-5 minutos. <strong>Mecanismo:</strong> Vasoconstrição (alfa-agonista) para aumentar a pressão de perfusão coronariana e cerebral." }, { heading: "Amiodarona", content: "<strong>Indicação:</strong> FV/TVSP refratários ao choque após o 2º choque. <strong>Dose:</strong> 1ª dose: 300 mg EV/IO em bolus. 2ª dose: 150 mg EV/IO em bolus. <strong>Mecanismo:</strong> Antiarrítmico de classe III, prolonga a repolarização." }, { heading: "Atropina", content: "<strong>Indicação:</strong> Bradicardia sintomática. Não indicada rotineiramente para AESP/Assistolia. <strong>Dose:</strong> 1 mg EV/IO a cada 3-5 minutos (máx. 3 mg). <strong>Mecanismo:</strong> Bloqueia o efeito do nervo vago, acelerando o ritmo sinusal." }] }
};

export function showStudyDetail(studyKey) {
    if (!checkAccess('study_review')) return;
    const study = STUDY_GUIDES[studyKey];
    if (!study) { alert("Guia de estudo não encontrado!"); return; }
    const titleDisplay = document.getElementById('study-title-display');
    const contentContainer = document.getElementById('study-content');
    const modal = document.getElementById('study-detail-modal');
    if (titleDisplay) titleDisplay.textContent = study.title;
    if (contentContainer) {
        contentContainer.innerHTML = '';
        study.sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.innerHTML = `<h4>${section.heading}</h4>${section.content}`;
            contentContainer.appendChild(sectionDiv);
        });
    }
    if (modal) modal.classList.add('show');
}

export function downloadProtocolPDF(protocolKey) {
    if (!checkAccess('pdf_download')) { alert('Recurso disponível apenas para assinantes Estudante ou Profissional.'); return; }
    const protocol = PROTOCOLS[protocolKey];
    if (!protocol) return alert("Protocolo não encontrado para download.");
    const contentElement = document.getElementById('protocol-content'); 
    const watermarkOverlay = document.getElementById('pdf-watermark-overlay');
    if (!contentElement) return alert("Erro: Conteúdo do protocolo não encontrado na tela.");
    if (watermarkOverlay) {
        const watermarkClone = watermarkOverlay.cloneNode(true);
        watermarkClone.style.display = 'block'; watermarkClone.style.position = 'absolute'; watermarkClone.style.zIndex = '9999'; watermarkClone.style.opacity = '0.2'; watermarkClone.style.transform = 'rotate(-30deg)'; watermarkClone.style.width = '100%'; watermarkClone.style.height = '100%'; watermarkClone.style.top = '0'; watermarkClone.style.left = '0'; watermarkClone.style.textAlign = 'center'; watermarkClone.style.color = '#333'; watermarkClone.innerHTML = `<h1 style="font-size: 60px; margin-top: 30%;">S.I.A.V.</h1>`;
        contentElement.appendChild(watermarkClone);
    }
    alert("Iniciando o download do PDF. Por favor, use a função 'Salvar como PDF' na janela de impressão para obter o arquivo com a marca d'água.");
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>' + protocol.title + '</title><link rel="stylesheet" href="style.css" type="text/css" /></head><body><div id="print-area">');
    printWindow.document.write(protocol.content);
    printWindow.document.write('<div style="position: fixed; top: 30%; left: 0; width: 100%; text-align: center; opacity: 0.15; transform: rotate(-30deg); font-size: 60px; color: #333;">S.I.A.V.</div></div></body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(function(){ printWindow.print(); printWindow.close(); }, 500);
    const tempWatermark = contentElement.querySelector('#pdf-watermark-overlay');
    if (tempWatermark) tempWatermark.remove();
}

export function showProtocolDetail(protocolKey) {
    const protocol = PROTOCOLS[protocolKey];
    if (!protocol) { alert("Protocolo não encontrado!"); return; }
    const titleDisplay = document.getElementById('protocol-title-display');
    const content = document.getElementById('protocol-content');
    const modal = document.getElementById('protocol-detail-modal');
    const downloadBtn = document.getElementById('protocol-download-btn');
    if(downloadBtn) {
        downloadBtn.onclick = () => downloadProtocolPDF(protocolKey);
        if (!checkAccess('pdf_download', false)) { downloadBtn.disabled = true; downloadBtn.textContent = '🔒 Download (Upgrade)'; }
        else { downloadBtn.disabled = false; downloadBtn.textContent = '📥 Baixar PDF'; }
    }
    if(titleDisplay) titleDisplay.textContent = protocol.title;
    if(content) content.innerHTML = protocol.content;
    if(modal) modal.classList.add('show');
}

export function getTreatmentRecommendation(cause, patientData) {
    const weight = patientData.weight || 70;
    const age = patientData.age || 30;
    const isPediatric = age < 18;
    const isElderly = age >= 65;
    const treatments = {
        'Hipovolemia': () => { const bolusVolume = isPediatric ? Math.round(weight * 20) : Math.round(weight * 10); return isPediatric ? `1️⃣ INFUNDIR: Soro Fisiológico 0,9% ${bolusVolume}ml (20ml/kg) em 5-10 minutos.\n2️⃣ REAVALIAR perfusão após cada bolus.\n3️⃣ REPETIR até melhora clínica.\n4️⃣ SANGRAMENTO ativo? Considerar concentrado de hemácias.` : `1️⃣ INFUNDIR: Cristaloide 500-1000ml em acesso calibroso.\n2️⃣ REAVALIAR a cada bolus.\n3️⃣ SANGRAMENTO? Protocolo de transfusão maciça.\n4️⃣ ${isElderly ? 'CUIDADO: Avaliar sobrecarga.' : 'Considerar expansão até 30ml/kg.'}`; },
        'Hipóxia': () => { return isPediatric ? `1️⃣ VERIFICAR: Via aérea pérvia?\n2️⃣ OXIGENAR: O2 a 100%.\n3️⃣ VENTILAR: 12-20 rpm.\n4️⃣ MONITORAR: Capnografia.\n5️⃣ DESCARTAR: Pneumotórax.` : `1️⃣ CHECAR: Tubo orotraqueal bem fixado?\n2️⃣ OXIGENAR: O2 a 100%.\n3️⃣ VENTILAR: 10 rpm.\n4️⃣ MONITORAR: EtCO2.\n5️⃣ INVESTIGAR: Pneumotórax.`; },
        'Hidrogênio (Acidose)': () => { const bicarbonateDose = Math.round(weight * 1); return `1️⃣ VENTILAR adequadamente.\n2️⃣ BICARBONATO DE SÓDIO ${bicarbonateDose} mEq EV SOMENTE SE: pH <7,1 OU Hipercalemia grave OU Intoxicação tricíclica.\n3️⃣ ${isPediatric ? 'DILUIR em SF.' : 'INFUNDIR lentamente.'}\n4️⃣ CORRIGIR causa de base.`; },
        'Hipo/Hipercalemia': () => { const insulinDose = isPediatric ? `0,1 UI/kg` : '10 UI'; return `🔴 GASOMETRIA ARTERIAL URGENTE!\n\n📈 HIPERCALEMIA:\n1️⃣ GLUCONATO DE CÁLCIO 10%.\n2️⃣ INSULINA Regular ${insulinDose} + Glicose 50%.\n3️⃣ BICARBONATO DE SÓDIO: ${Math.round(weight * 1)} mEq.\n📉 HIPOCALEMIA:\n1️⃣ Cloreto de Potássio (KCl) 10-20 mEq EV.`; },
        'Hipotermia': () => { return `⚠️ TEMPERATURA <30°C = RCP PROLONGADA!\n\n1️⃣ REAQUECER:\n   • Soros EV aquecidos\n   • Mantas térmicas\n2️⃣ NÃO DECLARAR ÓBITO até temperatura >32°C.\n3️⃣ MEDICAÇÕES e CARDIOVERSÃO podem ser ineficazes <30°C.`; },
        'Tamponamento Cardíaco': () => { const fluidBolus = isPediatric ? Math.round(weight * 20) : 1000; return `🚨 EMERGÊNCIA CIRÚRGICA!\n\n1️⃣ PERICARDIOCENTESE imediata.\n2️⃣ EXPANSÃO VOLÊMICA: Cristaloide ${fluidBolus}ml em bolus rápido.\n3️⃣ SINAIS CLÍNICOS: Tríade de Beck.\n4️⃣ FALHOU? Toracotomia de emergência.`; },
        'Pneumotórax Hipertensivo': () => { const needleSize = isPediatric ? 'jelco 18 ou 20' : 'jelco 14 ou 16'; return `⚠️ NÃO AGUARDAR RAIO-X!\n\n1️⃣ DESCOMPRESSÃO IMEDIATA: Agulha (${needleSize}) no 2° EIC linha hemiclavicular.\n2️⃣ SINAIS CLÍNICOS: Desvio de traqueia, ausência de MV.\n3️⃣ SEGUIR com drenagem torácica.`; },
        'Trombose (TEP/IAM)': () => { const rtpaDose = isPediatric ? 'CONSULTAR especialista' : `${weight}mg`; return `🩸 TEP: 1️⃣ RCP 60-90 min. 2️⃣ TROMBOLÍTICO: rtPA ${rtpaDose}. 3️⃣ Anticoagulação plena.\n\n❤️ IAM: 1️⃣ CATETERISMO de emergência. 2️⃣ Manter RCP. 3️⃣ Trombolítico se indisponível.`; },
        'Tóxicos': () => { const charcoalDose = isPediatric ? Math.round(weight * 1) : 50; return `🧪 IDENTIFICAR A INTOXICAÇÃO:\n\n💊 ANTÍDOTOS: Naloxona, Atropina, Glucagon, Flumazenil.\n🥄 DESCONTAMINAÇÃO: Carvão ativado ${charcoalDose}g.\n💉 TRATAMENTOS: Bicarbonato, Emulsão lipídica.`; },
        'Trauma': () => { return `🩹 CONTROLE DE HEMORRAGIA:\n1️⃣ Compressão direta.\n2️⃣ Garrote.\n🔪 TORACOTOMIA DE RESSUSCITAÇÃO se trauma penetrante.\n🫁 AVALIAR Pneumotórax, Tamponamento.\n🚑 TRANSPORTE RÁPIDO.`; }
    };
    return treatments[cause] ? treatmentscause : 'Tratamento não disponível para esta causa.';
}

export function toggleCause(element) {
    const cause = element.getAttribute('data-cause');
    const isChecked = element.classList.contains('checked');
    const causesHeader = document.querySelector('.causes-header');
    const treatmentBox = document.getElementById('causes-treatment-box');
    const causeName = document.getElementById('selected-cause-name');
    const causeTreatment = document.getElementById('selected-cause-treatment');
    
    document.querySelectorAll('#causes-screen .cause-item.checked').forEach(item => {
        const itemCause = item.getAttribute('data-cause');
        if (item !== element) { item.classList.remove('checked'); state.causesChecked = state.causesChecked.filter(c => c !== itemCause); }
    });

    if (!isChecked) {
        element.classList.add('checked');
        const personalizedTreatment = getTreatmentRecommendation(cause, state.patient);
        if (causesHeader) causesHeader.classList.add('treatment-active');
        if (treatmentBox) { treatmentBox.style.display = 'block'; if (causeName) causeName.textContent = `${cause} - Protocolo Personalizado`; if (causeTreatment) causeTreatment.textContent = personalizedTreatment; }
        if (!state.causesChecked.includes(cause)) state.causesChecked.push(cause);
    } else {
        element.classList.remove('checked');
        if (causesHeader) causesHeader.classList.remove('treatment-active');
        if (treatmentBox) treatmentBox.style.display = 'none';
        state.causesChecked = state.causesChecked.filter(c => c !== cause);
    }
}

export function toggleStudyHSTs(element) {
    const cause = element.getAttribute('data-study-cause');
    const instruction = HTS_INSTRUCTIONS[cause].instruction;
    const isExpanded = element.classList.contains('expanded');
    let contentBox = element.querySelector('.protocol-content-box');

    document.querySelectorAll('#hs-ts-study-list .protocol-item.expanded').forEach(item => {
        if (item !== element) {
            item.classList.remove('expanded'); item.querySelector('.protocol-content-box')?.remove();
            item.querySelector('.protocol-title').textContent = item.querySelector('.protocol-title').textContent.replace(' (DETALHE)', '');
        }
    });

    if (isExpanded) {
        if (contentBox) contentBox.remove();
        element.classList.remove('expanded');
        element.querySelector('.protocol-title').textContent = element.querySelector('.protocol-title').textContent.replace(' (DETALHE)', '');
    } else {
        if (!contentBox) {
            contentBox = document.createElement('div'); contentBox.className = 'protocol-content-box'; contentBox.style.transition = 'max-height 0.3s ease-out';
            contentBox.innerHTML = `<p style="font-weight: 700; color: var(--dark);">Análise da Causa:</p><p style="font-size: 0.9rem; margin-top: 5px; margin-bottom: 10px;">${instruction}</p>`;
            element.appendChild(contentBox);
        }
        element.classList.add('expanded');
        element.querySelector('.protocol-title').textContent += ' (DETALHE)';
    }
}

export function createStudyHSTsList() {
    const listContainer = document.getElementById('hs-ts-study-list');
    if (!listContainer) return;
    Object.keys(HTS_INSTRUCTIONS).forEach(cause => {
        const item = document.createElement('div'); item.className = 'protocol-item'; item.setAttribute('data-study-cause', cause);
        item.onclick = function() { toggleStudyHSTs(this); };
        item.innerHTML = `<div class="protocol-title">${cause}</div><div class="protocol-desc">Clique para ver o **detalhe** e a **ação** imediata.</div>`;
        listContainer.appendChild(item);
    });
}

export function closeTreatmentFullscreen() {}