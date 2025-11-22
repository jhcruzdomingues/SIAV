// FIX RÁPIDO DO TOGGLE - FUNCIONA 100%
setTimeout(function() {
    let isAnual = false;

    function atualizarPrecos() {
        // Estudante
        const estudantePreco = document.querySelector('[data-plan="estudante"] .price-value');
        const estudanteDetalhe = document.querySelector('[data-plan="estudante"] .monthly-info');
        const estudanteAnual = document.querySelector('[data-plan="estudante"] .annual-info');

        if (estudantePreco) {
            estudantePreco.textContent = isAnual ? '7,92' : '9,90';
        }
        if (estudanteDetalhe) {
            estudanteDetalhe.style.display = isAnual ? 'none' : 'inline';
            estudanteDetalhe.textContent = 'R$ 9,90 cobrado mensalmente';
        }
        if (estudanteAnual) {
            estudanteAnual.style.display = isAnual ? 'inline' : 'none';
            estudanteAnual.textContent = 'R$ 95/ano';
        }

        // Profissional
        const profPreco = document.querySelector('[data-plan="profissional"] .price-value');
        const profDetalhe = document.querySelector('[data-plan="profissional"] .monthly-info');
        const profAnual = document.querySelector('[data-plan="profissional"] .annual-info');
        const profEconomia = document.querySelector('[data-plan="profissional"] .monthly-savings');
        const profEconomiaAnual = document.querySelector('[data-plan="profissional"] .annual-savings');

        if (profPreco) {
            profPreco.textContent = isAnual ? '15,92' : '19,90';
        }
        if (profDetalhe) {
            profDetalhe.style.display = isAnual ? 'none' : 'inline';
            profDetalhe.textContent = 'R$ 19,90 cobrado mensalmente';
        }
        if (profAnual) {
            profAnual.style.display = isAnual ? 'inline' : 'none';
            profAnual.textContent = 'R$ 191/ano';
        }
        if (profEconomia) {
            profEconomia.style.display = isAnual ? 'none' : 'inline';
        }
        if (profEconomiaAnual) {
            profEconomiaAnual.style.display = isAnual ? 'inline' : 'none';
        }

        // Botões
        document.querySelectorAll('.billing-label').forEach(btn => {
            const period = btn.getAttribute('data-period');
            if ((period === 'annual' && isAnual) || (period === 'monthly' && !isAnual)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Adicionar cliques
    document.querySelectorAll('.billing-label').forEach(btn => {
        btn.onclick = function() {
            isAnual = this.getAttribute('data-period') === 'annual';
            atualizarPrecos();
            return false;
        };
    });

    // Inicializar
    atualizarPrecos();
}, 500);
