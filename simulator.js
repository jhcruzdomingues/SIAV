// =====================================================
// GAME ENGINE: Simulador Avançado Interativo
// =====================================================

export class AdvancedSimulator {
    constructor(dependencies) {
        this.state = dependencies.state;
        this.checkAndIncrementSimulationUse = dependencies.checkAndIncrementSimulationUse;
        this.showToastNotification = dependencies.showToastNotification;
        this.openPlansModal = dependencies.openPlansModal;
        
        this.simulationState = {
            caseData: null,
            currentStepIndex: 0,
            totalScore: 0,
            attempts: [],
            startTime: null
        };

        // Expor a instância globalmente para os botões com onclick inline
        window.simulatorInstance = this;
    }

    async start(clinicalCase) {
        console.log('🚀 [SIMULATOR] Iniciando Game Engine...');

        const userPlan = this.state.currentUser?.plan || 'free';
        console.log('👤 Plano do usuário:', userPlan);

        const usageCheck = await this.checkAndIncrementSimulationUse(userPlan);
        console.log('📊 Resultado da verificação de limite:', usageCheck);

        if (!usageCheck.allowed) {
            console.warn('🚫 LIMITE DIÁRIO ATINGIDO - Simulador Avançado bloqueado');
            const userWantsUpgrade = confirm(usageCheck.message + '\n\nDeseja ver os planos disponíveis?');
            if (userWantsUpgrade) {
                if (typeof this.openPlansModal === 'function') {
                    this.openPlansModal();
                }
            }
            return;
        }

        if (usageCheck.isWarning) {
            console.warn('⚠️ ALERTA - Próximo do limite do Simulado Avançado');
            this.showToastNotification(usageCheck.message, 'warning', 8000);
        }

        if (!clinicalCase) {
            console.error('❌ [SIMULATOR] clinicalCase é null/undefined');
            alert('Erro crítico: Caso clínico não fornecido.');
            return;
        }

        if (!clinicalCase.game_flow || !Array.isArray(clinicalCase.game_flow)) {
            console.error('❌ [SIMULATOR] game_flow inválido:', clinicalCase);
            alert('Erro: Estrutura do caso clínico corrompida. game_flow ausente ou inválido.');
            return;
        }

        if (clinicalCase.game_flow.length === 0) {
            console.error('❌ [SIMULATOR] game_flow vazio');
            alert('Erro: Caso clínico sem etapas (game_flow vazio).');
            return;
        }

        console.log('✅ [SIMULATOR] Validações OK - Caso:', clinicalCase.title);

        this.simulationState = {
            caseData: clinicalCase,
            currentStepIndex: 0,
            totalScore: 0,
            attempts: [],
            startTime: Date.now()
        };

        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.id = 'simulation-game-modal';
        modal.style.zIndex = '10000';

        modal.innerHTML = `
            <div class="modal-content sim-game-container">
                <div class="modal-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <h2 style="margin: 0;">⚡ ${clinicalCase.title}</h2>
                        <span class="sim-difficulty-badge ${clinicalCase.difficulty}">
                            ${clinicalCase.difficulty === 'facil' ? '🟢 Fácil' : clinicalCase.difficulty === 'medio' ? '🟡 Médio' : '🔴 Difícil'}
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div class="sim-score-display">
                            <i class="fas fa-star"></i> <span id="sim-score">0</span> pts
                        </div>
                        <button onclick="window.simulatorInstance.closeSimulation()" class="close-modal-btn" title="Sair do Simulador">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div class="modal-body" id="simulation-game-body">
                    <!-- Conteúdo dinâmico renderizado por renderSimulationStep() -->
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.resetSimulatorCard();
        this.renderSimulationStep(0);
    }

    renderSimulationStep(stepIndex) {
        console.log(`🎬 [RENDER] Renderizando step ${stepIndex}...`);

        if (!this.simulationState || !this.simulationState.caseData) {
            alert('Erro interno: Estado do jogo corrompido.');
            this.closeSimulation();
            return;
        }

        const step = this.simulationState.caseData.game_flow[stepIndex];

        if (!step) {
            alert(`Erro: Etapa ${stepIndex} não existe no caso clínico.`);
            this.closeSimulation();
            return;
        }

        this.simulationState.currentStepIndex = stepIndex;

        const container = document.getElementById('simulation-game-body');
        if (!container) return;

        const totalSteps = this.simulationState.caseData.game_flow.length;
        const progressPercent = ((stepIndex + 1) / totalSteps) * 100;

        container.innerHTML = `
            <!-- Barra de Progresso -->
            <div class="sim-progress-bar-container">
                <div class="sim-progress-bar" style="width: ${progressPercent}%"></div>
            </div>
            <div class="sim-progress-text">Etapa ${stepIndex + 1} de ${totalSteps}</div>

            <!-- Monitor de Sinais Vitais -->
            <div class="sim-monitor">
                <div class="sim-monitor-header">
                    <i class="fas fa-heartbeat sim-monitor-pulse"></i>
                    <span>MONITOR MULTIPARAMÉTRICO</span>
                </div>
                <div class="sim-monitor-body">
                    <div class="sim-vital-row">
                        <div class="sim-vital-box">
                            <div class="sim-vital-label">FC</div>
                            <div class="sim-vital-value ${step.monitor.fc === 0 ? 'critical' : ''}">${step.monitor.fc}</div>
                            <div class="sim-vital-unit">bpm</div>
                        </div>
                        <div class="sim-vital-box">
                            <div class="sim-vital-label">PA</div>
                            <div class="sim-vital-value ${step.monitor.pa === '0/0' ? 'critical' : ''}">${step.monitor.pa}</div>
                            <div class="sim-vital-unit">mmHg</div>
                        </div>
                        <div class="sim-vital-box">
                            <div class="sim-vital-label">SpO₂</div>
                            <div class="sim-vital-value ${step.monitor.spo2 < 90 ? 'critical' : ''}">${step.monitor.spo2}</div>
                            <div class="sim-vital-unit">%</div>
                        </div>
                    </div>
                    <div class="sim-rhythm-display">
                        <div class="sim-rhythm-label">RITMO ECG:</div>
                        <div class="sim-rhythm-value ${this.getRhythmClass(step.monitor.ritmo)}">${step.monitor.ritmo}</div>
                    </div>
                </div>
            </div>

            <!-- Cenário/Mensagem -->
            <div class="sim-scenario-box">
                <div class="sim-scenario-title">
                    <i class="fas fa-stethoscope"></i> ${step.title}
                </div>
                <div class="sim-scenario-message">${step.message}</div>
            </div>

            <!-- Opções de Resposta -->
            <div class="sim-options-grid" id="sim-options-container">
                ${step.options.map((option, index) => {
                    const optionId = option.id || String.fromCharCode(97 + index);
                    const optionLetter = optionId.toString().toUpperCase();

                    return `
                        <button class="sim-option-btn" data-option-id="${optionId}" onclick="window.simulatorInstance.handleOptionClick('${optionId}', ${stepIndex})">
                            <span class="sim-option-letter">${optionLetter}</span>
                            <span class="sim-option-text">${option.text || 'Sem texto'}</span>
                        </button>
                    `;
                }).join('')}
            </div>

            <!-- Área de Feedback (Inicialmente oculta) -->
            <div id="sim-feedback-box" class="sim-feedback-box" style="display: none;"></div>
        `;
    }

    handleOptionClick(optionId, stepIndex) {
        console.log(`🖱️ [CLICK] Opção clicada: ${optionId} no step ${stepIndex}`);

        if (!this.simulationState || !this.simulationState.caseData) return;

        const step = this.simulationState.caseData.game_flow[stepIndex];
        if (!step || !step.options) return;

        const option = step.options.find(opt => opt.id === optionId);
        if (!option) return;

        this.simulationState.attempts.push({
            step: stepIndex,
            option: optionId,
            correct: option.correct,
            points: option.points || 0
        });

        document.querySelectorAll('.sim-option-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.pointerEvents = 'none';
        });

        const clickedBtn = document.querySelector(`[data-option-id="${optionId}"]`);
        if (clickedBtn) {
            clickedBtn.classList.add(option.correct ? 'correct' : 'incorrect');
        }

        if (!option.correct) {
            const correctOption = step.options.find(opt => opt.correct);
            if (correctOption) {
                const correctBtn = document.querySelector(`[data-option-id="${correctOption.id}"]`);
                if (correctBtn) {
                    setTimeout(() => {
                        correctBtn.classList.add('correct', 'reveal');
                    }, 500);
                }
            }
        }

        this.simulationState.totalScore += (option.points || 0);
        document.getElementById('sim-score').textContent = this.simulationState.totalScore;

        this.showFeedback(option);

        if (option.next_step !== null && option.next_step !== undefined) {
            setTimeout(() => {
                const nextStepIndex = this.simulationState.caseData.game_flow.findIndex(s => s.step_id === option.next_step);

                if (nextStepIndex !== -1) {
                    this.renderSimulationStep(nextStepIndex);
                } else {
                    this.showGameOver();
                }
            }, 3500);
        } else {
            setTimeout(() => {
                this.showGameOver();
            }, 3500);
        }
    }

    showFeedback(option) {
        const feedbackBox = document.getElementById('sim-feedback-box');
        if (!feedbackBox) return;

        feedbackBox.className = `sim-feedback-box ${option.correct ? 'success' : 'error'} show`;
        feedbackBox.innerHTML = `
            <div class="sim-feedback-icon">
                ${option.correct ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-times-circle"></i>'}
            </div>
            <div class="sim-feedback-content">
                <div class="sim-feedback-title">${option.correct ? 'CORRETO!' : 'INCORRETO'}</div>
                <div class="sim-feedback-message">${option.feedback}</div>
                ${option.points ? `<div class="sim-feedback-points">${option.points > 0 ? '+' : ''}${option.points} pontos</div>` : ''}
            </div>
        `;
        feedbackBox.style.display = 'flex';

        setTimeout(() => {
            feedbackBox.classList.add('animate');
        }, 10);
    }

    async showGameOver() {
        console.log('🏁 [GAMEOVER] Finalizando simulação...');

        const container = document.getElementById('simulation-game-body');
        if (!container) return;

        const elapsedTime = Math.floor((Date.now() - this.simulationState.startTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;

        const totalPossibleScore = this.simulationState.caseData.game_flow.reduce((sum, step) => {
            const correctOption = step.options.find(opt => opt.correct);
            return sum + (correctOption?.points || 0);
        }, 0);

        const scorePercent = totalPossibleScore > 0 ? Math.round((this.simulationState.totalScore / totalPossibleScore) * 100) : 0;

        let performanceLevel = '';
        let performanceColor = '';
        let performanceIcon = '';

        if (scorePercent >= 90) {
            performanceLevel = 'EXCELENTE!';
            performanceColor = '#27ae60';
            performanceIcon = 'fa-trophy';
        } else if (scorePercent >= 70) {
            performanceLevel = 'BOM TRABALHO!';
            performanceColor = '#3498db';
            performanceIcon = 'fa-thumbs-up';
        } else if (scorePercent >= 50) {
            performanceLevel = 'PODE MELHORAR';
            performanceColor = '#f39c12';
            performanceIcon = 'fa-star-half-alt';
        } else {
            performanceLevel = 'PRECISA REVISAR';
            performanceColor = '#e74c3c';
            performanceIcon = 'fa-book';
        }

        try {
            const simulationData = {
                case_id: this.simulationState.caseData.id,
                case_title: this.simulationState.caseData.title,
                difficulty: this.simulationState.caseData.difficulty,
                total_score: this.simulationState.totalScore,
                total_steps: this.simulationState.caseData.game_flow.length,
                attempts: this.simulationState.attempts,
                duration_seconds: elapsedTime,
                completed: true
            };

            if (window.SIAV && typeof window.SIAV.saveSimulationLog === 'function') {
                const result = await window.SIAV.saveSimulationLog(simulationData);
                if (result && result.success) {
                    console.log('✅ [GAMEOVER] Resultado salvo! ID:', result.id);
                }
            }
        } catch (err) {
            console.error('❌ [GAMEOVER] Erro ao salvar resultado:', err);
        }

        container.innerHTML = `
            <div class="sim-game-over">
                <div class="sim-game-over-icon" style="color: ${performanceColor};">
                    <i class="fas ${performanceIcon}"></i>
                </div>
                <h2 class="sim-game-over-title" style="color: ${performanceColor};">${performanceLevel}</h2>
                <div class="sim-game-over-subtitle">Caso Clínico Concluído</div>

                <div class="sim-stats-grid">
                    <div class="sim-stat-card">
                        <div class="sim-stat-icon"><i class="fas fa-star"></i></div>
                        <div class="sim-stat-value">${this.simulationState.totalScore}</div>
                        <div class="sim-stat-label">Pontuação Final</div>
                    </div>
                    <div class="sim-stat-card">
                        <div class="sim-stat-icon"><i class="fas fa-percentage"></i></div>
                        <div class="sim-stat-value">${scorePercent}%</div>
                        <div class="sim-stat-label">Aproveitamento</div>
                    </div>
                    <div class="sim-stat-card">
                        <div class="sim-stat-icon"><i class="fas fa-clock"></i></div>
                        <div class="sim-stat-value">${minutes}:${seconds.toString().padStart(2, '0')}</div>
                        <div class="sim-stat-label">Tempo Total</div>
                    </div>
                </div>

                <div class="sim-game-over-message">
                    ${scorePercent >= 70
                        ? '🎉 Parabéns! Você demonstrou ótimo conhecimento dos protocolos ACLS/BLS.'
                        : '📚 Continue estudando! Revise os protocolos e tente novamente.'
                    }
                </div>

                <div class="sim-game-over-actions">
                    <button onclick="window.simulatorInstance.closeSimulation()" class="secondary-btn" style="flex: 1;">
                        <i class="fas fa-arrow-left"></i> Voltar
                    </button>
                    <button onclick="window.simulatorInstance.retryCase()" class="secondary-btn" style="flex: 1;">
                        <i class="fas fa-redo"></i> Repetir
                    </button>
                    <button onclick="window.simulatorInstance.startNewCase()" class="primary-btn" style="flex: 1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <i class="fas fa-play-circle"></i> Novo Caso
                    </button>
                </div>
            </div>
        `;
    }

    closeSimulation() {
        const modal = document.getElementById('simulation-game-modal');
        if (modal) {
            modal.remove();
        }

        this.simulationState = {
            caseData: null,
            currentStepIndex: 0,
            totalScore: 0,
            attempts: [],
            startTime: null
        };

        this.resetSimulatorCard();
    }

    retryCase() {
        if (this.simulationState.caseData) {
            const caseData = this.simulationState.caseData;
            this.closeSimulation();
            setTimeout(() => {
                this.start(caseData);
            }, 300);
        }
    }

    async startNewCase() {
        console.log('🆕 [NEWCASE] Buscando novo caso clínico...');

        try {
            const currentCaseId = this.simulationState.caseData?.id || null;

            this.closeSimulation();

            const modal = document.createElement('div');
            modal.className = 'modal show';
            modal.id = 'simulation-game-modal';
            modal.style.zIndex = '10000';
            modal.innerHTML = `
                <div class="modal-content sim-game-container" style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 3em; color: var(--primary); margin-bottom: 20px;"></i>
                    <h2>Carregando Novo Caso Clínico...</h2>
                    <p style="color: var(--secondary);">Buscando um caso diferente para você</p>
                </div>
            `;
            document.body.appendChild(modal);

            let newCase = null;
            if (window.SIAV && typeof window.SIAV.fetchRandomClinicalCase === 'function') {
                newCase = await window.SIAV.fetchRandomClinicalCase(currentCaseId);
            }

            modal.remove();

            if (newCase) {
                setTimeout(() => {
                    this.start(newCase);
                }, 300);
            } else {
                alert('❌ Erro: Não foi possível carregar novo caso clínico.');
            }

        } catch (err) {
            console.error('❌ [NEWCASE] Erro ao buscar novo caso:', err);
            const modal = document.getElementById('simulation-game-modal');
            if (modal) modal.remove();
            alert('❌ Erro ao carregar novo caso clínico\n\n' + err.message);
        }
    }

    getRhythmClass(rhythm) {
        if (!rhythm) return '';
        const rhythmLower = rhythm.toLowerCase();
        if (rhythmLower.includes('fibrilação') || rhythmLower.includes('fv')) return 'rhythm-vf';
        if (rhythmLower.includes('assistolia')) return 'rhythm-asystole';
        if (rhythmLower.includes('sinusal')) return 'rhythm-sinus';
        if (rhythmLower.includes('taquicardia')) return 'rhythm-tachy';
        if (rhythmLower.includes('bradicardia')) return 'rhythm-brady';
        return '';
    }

    resetSimulatorCard() {
        const simulatorCard = document.getElementById('quiz-mode-simulator');
        if (simulatorCard) {
            simulatorCard.innerHTML = `
                <div class="quiz-mode-card-icon">
                    <i class="fas fa-cloud"></i>
                </div>
                <div class="quiz-mode-card-content">
                    <h3>⚡ Simulador Avançado</h3>
                    <p>Casos clínicos complexos e dinâmicos. <strong>Requer Internet</strong></p>
                </div>
                <div class="quiz-mode-card-badge">
                    <i class="fas fa-wifi"></i> Online
                </div>
                <div class="quiz-mode-card-arrow">
                    <i class="fas fa-arrow-right"></i>
                </div>
            `;
            simulatorCard.style.pointerEvents = 'auto';
        }
    }
}