/*global supabase, List*/
const API_URL = import.meta.env.VITE_API_URL;
const ANON_KEY = import.meta.env.VITE_ANON_KEY;
const supabaseClient = supabase.createClient(API_URL, ANON_KEY);

supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log(event, session)
    if (event === "SIGNED_IN") {
        document.querySelector('body').classList.add('logged-in')

        loadConnections()
            .then(res => {
                const tableEl = document.querySelector('table')

                var options = {
                    valueNames: [ 'first_name', 'last_name', 'company', 'position', 'email', 'connected_on' ]
                };
                
                var connectionsList = new List(tableEl, options, res.data);

                document.querySelector('#search').addEventListener('change', (e) => connectionsList.search(e.target.value))
                document.querySelector('#first-name').addEventListener('click', () => connectionsList.sort('first_name'))
                document.querySelector('#last-name').addEventListener('click', () => connectionsList.sort('last_name'))
                document.querySelector('#company').addEventListener('click', () => connectionsList.sort('company'))
                document.querySelector('#position').addEventListener('click', () => connectionsList.sort('position'))
                document.querySelector('#email').addEventListener('click', () => connectionsList.sort('email'))
                document.querySelector('#connected-date').addEventListener('click', () => connectionsList.sort('connected_on'))

            })
            .then(() => document.querySelector('#message').textContent = '')
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

// load connections for current user
async function loadConnections() {
    // supabase filters by user
    const res = await supabaseClient
        .from('connections')
        .select('*', {
            count: 'estimated'
        });

    if (res.error) {
        console.error(res.error);
        document.querySelector('#message').textContent = res.error.message
        throw res.error.message
        // TODO format error message on page
    }

    return res
}