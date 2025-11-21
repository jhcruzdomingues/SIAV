/**
 * =============================================
 * SERVIÇO DE AUTENTICAÇÃO
 * =============================================
 * Gerencia login, registro e sessão de usuários
 */

import { supabase } from '../config/supabase.js';
import { state } from '../config/state.js';

/**
 * Faz login ou registra novo usuário
 * @param {string} email - Email do usuário
 * @param {string} password - Senha
 * @returns {Promise<{success: boolean, user: object, error: string}>}
 */
export async function handleLogin(email, password) {
  try {
    // Validacao de entrada
    if (!email || !password) {
      return {
        success: false,
        user: null,
        error: 'Email e senha sao obrigatorios'
      };
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        user: null,
        error: 'Formato de email invalido'
      };
    }

    // Validar tamanho da senha
    if (password.length < 6) {
      return {
        success: false,
        user: null,
        error: 'A senha deve ter pelo menos 6 caracteres'
      };
    }

    // Sanitizar email
    const sanitizedEmail = email.trim().toLowerCase();

    // Tenta fazer login
    let { data, error } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password
    });

    // Se falhou por conta não existir, tenta criar
    if (error && error.message.includes('Invalid login credentials')) {
      const signUpResult = await supabase.auth.signUp({
        email: sanitizedEmail,
        password
      });

      if (signUpResult.error) {
        return {
          success: false,
          user: null,
          error: `Erro ao criar conta: ${signUpResult.error.message}`
        };
      }

      data = signUpResult.data;
      console.log('Nova conta criada com sucesso!');
    } else if (error) {
      return {
        success: false,
        user: null,
        error: `Erro no login: ${error.message}`
      };
    }

    // Validar resposta
    if (!data || !data.user) {
      return {
        success: false,
        user: null,
        error: 'Resposta invalida do servidor de autenticacao'
      };
    }

    // Atualiza estado global
    state.user = data.user;

    return {
      success: true,
      user: data.user,
      error: null
    };
  } catch (err) {
    console.error('Erro no handleLogin:', err);
    return {
      success: false,
      user: null,
      error: err.message || 'Erro desconhecido ao fazer login'
    };
  }
}

/**
 * Faz logout do usuário
 * @returns {Promise<boolean>}
 */
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Erro ao fazer logout:', error);
      return false;
    }

    // Limpa estado global
    state.user = null;
    state.userProfile = null;
    state.userPlan = 'free';

    return true;
  } catch (err) {
    console.error('Erro no logout:', err);
    return false;
  }
}

/**
 * Verifica se há sessão ativa
 * @returns {Promise<object|null>}
 */
export async function checkSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Erro ao verificar sessão:', error);
      return null;
    }

    if (session) {
      state.user = session.user;
      return session.user;
    }

    return null;
  } catch (err) {
    console.error('Erro no checkSession:', err);
    return null;
  }
}

/**
 * Atualiza senha do usuário
 * @param {string} newPassword - Nova senha
 * @returns {Promise<{success: boolean, error: string}>}
 */
export async function updatePassword(newPassword) {
  try {
    // Validacao de entrada
    if (!newPassword) {
      return {
        success: false,
        error: 'Nova senha e obrigatoria'
      };
    }

    if (typeof newPassword !== 'string') {
      return {
        success: false,
        error: 'Senha deve ser uma string'
      };
    }

    if (newPassword.length < 6) {
      return {
        success: false,
        error: 'A senha deve ter pelo menos 6 caracteres'
      };
    }

    if (newPassword.length > 100) {
      return {
        success: false,
        error: 'A senha nao pode ter mais de 100 caracteres'
      };
    }

    // Verificar se usuario esta logado
    if (!state.user) {
      return {
        success: false,
        error: 'Usuario nao autenticado'
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      error: null
    };
  } catch (err) {
    console.error('Erro ao atualizar senha:', err);
    return {
      success: false,
      error: err.message || 'Erro desconhecido ao atualizar senha'
    };
  }
}

/**
 * Escuta mudanças no estado de autenticação
 * @param {function} callback - Função chamada quando auth state muda
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      state.user = session.user;
    } else {
      state.user = null;
      state.userProfile = null;
      state.userPlan = 'free';
    }

    callback(event, session);
  });
}
