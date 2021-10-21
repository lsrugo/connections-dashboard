/*global supabase*/
const API_URL = import.meta.env.VITE_API_URL;
const ANON_KEY = import.meta.env.VITE_ANON_KEY;
const supabaseClient = supabase.createClient(API_URL, ANON_KEY);

supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log(event, session)
    if (event === "SIGNED_IN") {
        document.querySelector('body').classList.add('logged-in')
    }
    if (event === "SIGNED_OUT") {
        document.querySelector('body').classList.remove('logged-in')
        // TODO change this to url of landing page
        // window.location.href = '/login.html'
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
        // TODO show error to user
        document.querySelector('#message').textContent = error.message
        return
    }
    // TODO tell user to check inbox
    console.log('magic link sent')
})

// handle sign out button
document.querySelector('#sign-out').addEventListener('click', () => supabaseClient.auth.signOut())
