/*global supabase*/
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

                replaceRows(res.data, tableEl.querySelector('tbody'))

                // document.querySelector('#search').addEventListener('change', (e) => connectionsList.search(e.target.value))
                document.querySelectorAll('th').forEach((el) => {
                    el.addEventListener('click', async (event) => {
                        const colEl = event.target
                        const col = colEl.classList[0]

                        // reset all icons to both arrows
                        for (const icon of tableEl.querySelectorAll('i')) {
                            icon.classList.remove('fa-sort-up')
                            icon.classList.remove('fa-sort-down')
                            icon.classList.add('fa-sort')
                        }

                        const icon = colEl.querySelector('i')
                        const asc = icon.classList.toggle('asc')
                        // remove icon with both arrows
                        icon.classList.remove('fa-sort')
                        // switch between up and down arrows
                        if (asc) {
                            icon.classList.add('fa-sort-up')
                        } else {
                            icon.classList.add('fa-sort-down')
                        }

                        const res = await supabaseClient
                            .from('connections')
                            .select('*')
                            .order(col, {ascending: asc})

                        if (res.error) {
                            console.error(res.error.message)
                        }

                        replaceRows(res.data, tableEl.querySelector('tbody'))
                    })
                })

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

function insertRow(row, index, table) {
    const rowEl = table.insertRow(index)

    rowEl.innerHTML = `
    <td class="first_name">${row.first_name}</td>
    <td class="last_name">${row.last_name}</td>
    <td class="company">${row.company}</td>
    <td class="position">${row.position || ''}</td>
    <td class="email">${row.email}</td>
    <td class="connected_on">${row.connected_on}</td>
    `

    return rowEl
}

function replaceRows(rows, table) {
    table.replaceChildren('')

    rows.forEach((row, index) => insertRow(row, index, table))
}
