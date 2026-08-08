// auth.js - handles register, login, forgot/reset frontend validation and API calls
(() => {
  function handleJSONResponse(resp) {
    return resp.json().catch(() => ({ error: 'Invalid server response' }));
  }

  // Helper to post JSON with credentials
  async function postJSON(url, data) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    return { status: resp.status, body: await handleJSONResponse(resp) };
  }

  // Register form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(registerForm);
      const data = Object.fromEntries(fd.entries());

      // client-side validation
      if (data.password !== data.password2) {
        return alert('Գաղտնաբառերը չեն համընկնում։');
      }
      if (data.password.length < 8) {
        return alert('Գաղտնաբառը պետք է առնվազն 8 նիշ լինի։');
      }
      try {
        const { status, body } = await postJSON('/api/auth/register', data);
        if (status === 200 || body.ok) {
          alert('Գրանցվել հաջողվեց։ Ստուգեք էլ. փոստը՝ հաստատումն սպասելու համար։');
          window.location.href = 'verification.html';
        } else {
          alert(body.error || 'Գրանցման սխալ։');
        }
      } catch (err) {
        alert('Սերվերի հետ կապի խնդիր։');
      }
    });
  }

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(loginForm);
      const data = Object.fromEntries(fd.entries());
      try {
        const { status, body } = await postJSON('/api/auth/login', data);
        if (status === 200 && body.token) {
          // token stored in HTTP-only cookie by server ideally; if server returns token, store in localStorage only if necessary
          window.location.href = 'dashboard.html';
        } else {
          alert(body.error || 'Մուտքի սխալ։');
        }
      } catch (err) {
        alert('Սերվերի հետ կապի խնդիր։');
      }
    });
  }

  // Forgot password
  const forgotForm = document.getElementById('forgot-form');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(forgotForm);
      const data = Object.fromEntries(fd.entries());
      try {
        const { status, body } = await postJSON('/api/auth/forgot-password', data);
        if (status === 200) {
          alert('Password reset link ուղարկվեց ձեր էլ. փոստին։');
          window.location.href = 'login.html';
        } else {
          alert(body.error || 'Սխալ։');
        }
      } catch {
        alert('Սերվերի կապի խնդիր։');
      }
    });
  }

  // Reset password
  const resetForm = document.getElementById('reset-form');
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(resetForm);
      const data = Object.fromEntries(fd.entries());
      if (data.newPassword !== data.newPassword2) return alert('Գաղտնաբառերը չեն համընկնում։');
      try {
        const { status, body } = await postJSON('/api/auth/reset-password', data);
        if (status === 200) {
          alert('Գաղտնաբառը հաջողությամբ վերականգնվեց։ Խնդրում ենք մուտք գործել։');
          window.location.href = 'login.html';
        } else {
          alert(body.error || 'Սխալ։');
        }
      } catch {
        alert('Սերվերի կապի խնդիր։');
      }
    });
  }

})();
