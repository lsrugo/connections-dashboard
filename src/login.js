/*global supabase*/
const API_URL = import.meta.env.VITE_API_URL;
const ANON_KEY = import.meta.env.VITE_ANON_KEY;
const supabaseClient = supabase.createClient(API_URL, ANON_KEY);

supabaseClient.auth.onAuthStateChange((event, session) => {
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
        // password: formData.get('password') // not using password
    }, {
        // handle localhost for development
        redirectTo: window.location.origin + '/'
    })
    if (error) {
        console.error(error)
        document.querySelector('#login-message').classList.remove('bg-green-500')
        document.querySelector('#login-message').classList.add('bg-red-500')
        document.querySelector('#login-message').textContent = error.message
        return
    }
    console.log('magic link sent')
    document.querySelector('#login-message').classList.remove('bg-red-500')
    document.querySelector('#login-message').classList.add('bg-green-500')
    document.querySelector('#login-message').textContent = 'Check your email for a login link'
})

// handle sign out button
document.querySelector('#sign-out').addEventListener('click', () => supabaseClient.auth.signOut())
