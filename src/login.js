/*global supabase*/
const API_URL = import.meta.env.VITE_API_URL;
const ANON_KEY = import.meta.env.VITE_ANON_KEY;
const supabaseClient = supabase.createClient(API_URL, ANON_KEY);

supabaseClient.auth.onAuthStateChange((event) => {
    console.log(event)
    if (event === "SIGNED_IN") {
        document.querySelector('body').classList.add('logged-in')
    }
    if (event === "SIGNED_OUT") {
        document.querySelector('body').classList.remove('logged-in')
    }
})

// handle sign in form
document.querySelector('#login').addEventListener('submit', async e => {
    // must call before first await
    // https://stackoverflow.com/a/37146788/10056307
    e.preventDefault()

    const formData = new FormData(e.target)
    const { error } = await supabaseClient.auth.signIn({
        email: formData.get('email'),
    }, {
        // handle localhost for development
        redirectTo: window.location.origin + '/'
    })
    const loginMessage = document.querySelector('#login-message')
    if (error) {
        console.error(error)
        loginMessage.classList.remove('bg-green-500')
        loginMessage.classList.add('bg-red-500')
        loginMessage.textContent = error.message
        return
    }
    console.log('magic link sent')
    loginMessage.classList.add('bg-green-500')
    loginMessage.classList.remove('bg-red-500')
    loginMessage.textContent = 'Check your email for a login link'
})

// handle sign out button
document.querySelector('#sign-out').addEventListener('click', () => supabaseClient.auth.signOut())

export default supabaseClient