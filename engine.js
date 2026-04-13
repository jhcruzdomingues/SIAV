// ==========================================
// ENGINE DO QUIZ SIMULADO
// ==========================================

export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export class QuizEngine {
    constructor(dependencies) {
        this.state = dependencies.state;
        this.supabase = dependencies.supabase;
        this.checkAccess = dependencies.checkAccess;
        this.closeModal = dependencies.closeModal;
        this.saveState = dependencies.saveState;
        this.updateDashboard = dependencies.updateDashboard;
    }

    async startQuiz() {
        if (!this.checkAccess('quiz_simulations')) return;

        const startBtn = document.getElementById('start-quiz-btn');
        if (startBtn) {
            startBtn.textContent = 'CARREGANDO QUESTÕES...';
            startBtn.disabled = true;
        }

        const questionCount = parseInt(document.getElementById('question-count')?.value) || 10;
        const difficulty = document.getElementById('difficulty')?.value || 'medio';
        const quizType = document.querySelector('input[name="quiz-type"]:checked')?.value || 'sbv';

        let fetchedQuestions = [];
        let usedFallback = false;

        try {
            // Checagem imediata de conexão para evitar timeout do Supabase
            if (!navigator.onLine) {
                console.warn('SIAV: Dispositivo offline, ativando fallback do quiz.');
                throw new Error('Offline');
            }

            // Tentar carregar do Supabase primeiro
            let query = this.supabase
                .from('quiz_questions')
                .select('question, options, answer, explanation')
                .eq('type', quizType);

            if (difficulty !== 'todos') {
                query = query.eq('difficulty', difficulty);
            }

            const { data, error } = await query;

            if (error || !data || data.length === 0) {
                throw new Error('Supabase indisponível ou sem questões');
            }

            fetchedQuestions = data;

        } catch (supabaseError) {
            // Fallback: carregar questões locais do JSON
            try {
                const response = await fetch('data/quiz-fallback.json');
                if (!response.ok) throw new Error('Arquivo JSON não encontrado');

                const jsonData = await response.json();

                // Filtrar questões por tipo e dificuldade
                fetchedQuestions = jsonData.questions.filter(q => {
                    const matchesType = q.type === quizType;
                    const matchesDifficulty = difficulty === 'todos' || q.difficulty === difficulty;
                    return matchesType && matchesDifficulty;
                }).map(q => {
                    // Corrige o formato da resposta offline: converte de índice numérico para a string exata
                    if (typeof q.answer === 'number' && q.options && q.options[q.answer]) {
                        q.answer = q.options[q.answer];
                    }
                    return q;
                });

                usedFallback = true;

                if (fetchedQuestions.length === 0) {
                    alert("⚠️ Não há questões disponíveis offline para esse filtro.\n\nConecte-se à internet para acessar todas as questões.");
                    if (startBtn) {
                        startBtn.textContent = 'INICIAR SIMULADO';
                        startBtn.disabled = false;
                    }
                    return;
                }

            } catch (fallbackError) {
                console.error("Erro no fallback:", fallbackError);
                alert(`❌ Não foi possível carregar o simulado.\n\nVerifique sua conexão com a internet ou contate o suporte.`);
                if (startBtn) {
                    startBtn.textContent = 'INICIAR SIMULADO';
                    startBtn.disabled = false;
                }
                return;
            }
        }

        // Processar questões (online ou offline)
        shuffleArray(fetchedQuestions);
        const finalQuestions = fetchedQuestions.slice(0, questionCount);

        this.state.quiz.active = true;
        this.state.quiz.questions = finalQuestions;
        this.state.quiz.currentQuestionIndex = 0;
        this.state.quiz.score = 0;
        this.state.quiz.config = {
            type: quizType.toUpperCase(),
            count: finalQuestions.length,
            difficulty: difficulty,
            offline: usedFallback
        };

        if (window.openModal) window.openModal('quiz-running-modal');

        // Mostrar aviso se estiver usando questões offline
        if (usedFallback) {
            const offlineWarning = document.createElement('div');
            offlineWarning.style.cssText = 'background: #ff9800; color: white; padding: 10px; text-align: center; margin-bottom: 10px; border-radius: 5px;';
            offlineWarning.textContent = '📴 Modo Offline - Questões limitadas (conecte-se para acessar todas)';
            const quizContainer = document.querySelector('#quiz-running-modal .modal-content');
            if (quizContainer) {
                quizContainer.insertBefore(offlineWarning, quizContainer.firstChild);
            }
        }

        this.displayQuestion(0);

        if (startBtn) {
            startBtn.textContent = 'INICIAR SIMULADO';
            startBtn.disabled = false;
        }
    }

    displayQuestion(index) {
        this.state.quiz.currentQuestionIndex = index;
        const q = this.state.quiz.questions[index];
        
        if (!q) {
            this.finishQuiz();
            return;
        }

        const nextBtn = document.getElementById('next-q-btn');
        if(nextBtn) {
            nextBtn.textContent = (index === this.state.quiz.questions.length - 1) ? "FINALIZAR SIMULADO" : "PRÓXIMA QUESTÃO";
            nextBtn.disabled = true; 
        }
        
        const feedbackBox = document.getElementById('feedback-box');
        if(feedbackBox) feedbackBox.style.display = 'none';

        const optionsContainer = document.getElementById('options-container');
        if (optionsContainer) optionsContainer.innerHTML = '';
        
        const qCount = document.getElementById('quiz-q-count');
        const scoreDisplay = document.getElementById('quiz-score');
        if(qCount) qCount.textContent = `Questão ${index + 1}/${this.state.quiz.questions.length}`;
        if(scoreDisplay) scoreDisplay.textContent = `Pontuação: ${this.state.quiz.score}`;
        
        const questionText = document.getElementById('question-text');
        if(questionText) questionText.textContent = q.question;

        let shuffledOptions = [...q.options];
        shuffleArray(shuffledOptions);
        
        shuffledOptions.forEach((option) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option-btn';
            btn.textContent = option;
            btn.addEventListener('click', () => this.checkAnswer(option, q.answer, btn));
            if (optionsContainer) optionsContainer.appendChild(btn);
        });
    }

    checkAnswer(userAnswer, correctAnswer, selectedButton) {
        const isCorrect = userAnswer === correctAnswer;
        
        document.querySelectorAll('.quiz-option-btn').forEach(btn => {
            btn.disabled = true;
            btn.classList.remove('selected');
            
            if (btn.textContent === userAnswer) {
                btn.classList.add('selected');
            }

            if (btn.textContent === correctAnswer) {
                btn.classList.add('correct');
            } else if (btn.textContent === userAnswer && !isCorrect) {
                btn.classList.add('incorrect');
            }
        });

        const q = this.state.quiz.questions[this.state.quiz.currentQuestionIndex];
        const feedbackBox = document.getElementById('feedback-box');
        const feedbackMessage = document.getElementById('feedback-message');
        const feedbackExplanation = document.getElementById('feedback-explanation');
        const nextBtn = document.getElementById('next-q-btn');

        if (isCorrect) {
            this.state.quiz.score++;
            if(feedbackMessage) feedbackMessage.textContent = "Correto! Excelente protocolo.";
            if(feedbackBox) feedbackBox.style.backgroundColor = 'rgba(39, 174, 96, 0.1)';
        } else {
            if(feedbackMessage) feedbackMessage.textContent = "Incorreto. Reveja o protocolo.";
            if(feedbackBox) feedbackBox.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
        }
        
        if(feedbackExplanation) feedbackExplanation.innerHTML = `<p style="font-weight: 700; color: #333;">Explicação:</p>${q.explanation}`;
        if(feedbackBox) feedbackBox.style.display = 'block';
        
        if(nextBtn) nextBtn.disabled = false;
        
        const scoreDisplay = document.getElementById('quiz-score');
        if(scoreDisplay) scoreDisplay.textContent = `Pontuação: ${this.state.quiz.score}`;
    }

    finishQuiz() {
        this.closeModal('quiz-running-modal');

        if (window.openModal) window.openModal('quiz-result-modal');
        
        const total = this.state.quiz.questions.length;
        const score = this.state.quiz.score;
        const percent = Math.round((score / total) * 100);
        
        this.state.quizResults.push({
            score: score,
            total: total,
            percent: percent,
            type: this.state.quiz.config.type,
            difficulty: this.state.quiz.config.difficulty
        });

        this.saveState(); 

        const messageDisplay = document.getElementById('result-message');
        const scoreDisplay = document.getElementById('final-score-display');
        const totalDisplay = document.getElementById('total-questions-display');

        if (percent >= 80) {
            if(messageDisplay) messageDisplay.textContent = "Excelente! Dominando os protocolos.";
            if(scoreDisplay) scoreDisplay.style.color = 'var(--success)';
        } else if (percent >= 50) {
            if(messageDisplay) messageDisplay.textContent = "Bom resultado! Continue revisando.";
            if(scoreDisplay) scoreDisplay.style.color = 'var(--warning)';
        } else {
            if(messageDisplay) messageDisplay.textContent = "É hora de estudar! Revise os protocolos.";
            if(scoreDisplay) scoreDisplay.style.color = 'var(--primary)';
        }

        if(scoreDisplay) scoreDisplay.textContent = score;
        if(totalDisplay) totalDisplay.textContent = total;
        
        this.state.quiz.active = false;
        this.updateDashboard();
    }
}