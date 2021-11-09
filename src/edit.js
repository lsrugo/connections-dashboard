/*global supabase*/
const API_URL = import.meta.env.VITE_API_URL;
const ANON_KEY = import.meta.env.VITE_ANON_KEY;
const supabaseClient = supabase.createClient(API_URL, ANON_KEY);

let id = new URLSearchParams(location.search).get('id');

let count;

loadSelectedConnection(id);

document.querySelector('#edit-form').addEventListener('submit', saveConnection);

async function loadSelectedConnection(id) {
    // leave form blank if no id is provided
    if (!id) {
        // TODO remove ... from progress element without breaking the layout
        // document.querySelector('#progress').textContent = '';
        document.body.classList.remove('loading');
        return;
    }

    document.body.classList.add('loading');

    if (count === undefined) {
        const countReq = await supabaseClient.from('connections').select('*', { count: 'estimated' }).limit(1);
        count = countReq.count
    }

    // load data for provided id from supabase
    supabaseClient
        .from('connections')
        .select('*')
        .eq('id', id)
        .limit(1)
        .single()
        .then(res => {
            if (res.error) {
                // TODO handle error
                console.error(res.error);
                return;
            }

            console.log('id', res.data.id);

            // document.querySelector('#progress').textContent = `${id} of ${count}`;

            // fill in form values with res.data
            for (const input of document.querySelectorAll('#edit-form input')) {
                input.value = res.data[input.name];
            }

            document.querySelector('#edit-form textarea').innerText = res.data.notes || '';

            // fill in view on LinkedIn link
            document.querySelector('#edit-form a').href = encodeURI(`https://www.linkedin.com/search/results/people/?company=${res.data.company}&firstName=${res.data.first_name}&lastName=${res.data.last_name}`);

            document.body.classList.remove('loading');
        })
}

function saveConnection(event) {
    event.preventDefault();

    console.log('saving form', id)

    document.body.classList.add('loading');

    const formData = new FormData(event.target);

    // create new connection if no id is provided
    if (!id) {
        supabaseClient
            .from('connections')
            .insert([{
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                company: formData.get('company'),
                position: formData.get('position'),
                email: formData.get('email'),
                connected_on: formData.get('connected_on'),
                notes: formData.get('notes')
            }])
            .then(res => {
                if (res.error) {
                    // TODO handle error
                    console.error(res.error);
                    return;
                }

                console.log('new connection', res.data);

                document.body.classList.remove('loading');
                // redirect to connections.html
                // location.href = '/connections.html';
            })
    } else {
        // update connection if id is provided
        supabaseClient
            .from('connections')
            .update({
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                company: formData.get('company'),
                position: formData.get('position'),
                email: formData.get('email'),
                connected_on: formData.get('connected_on'),
                notes: formData.get('notes')
            })
            .eq('id', id)
            .then(res => {
                if (res.error) {
                    // TODO handle error
                    console.error(res.error);
                    return;
                }

                document.body.classList.remove('loading');
                // redirect to connections.html
                // location.href = '/connections.html';
            })
    }
}

function nextConnection() {
    id = parseInt(id) + 1;
    loadSelectedConnection(id);
    document.querySelector('#previous').hidden = false;
}

function previousConnection() {
    id = parseInt(id) - 1;
    if (parseInt(id) <= 1) {
        document.querySelector('#previous').hidden = true;
        id = 1;
    }
    loadSelectedConnection(id);
}

// disable previous button if id is 1
if (id === '1') {
    document.querySelector('#previous').hidden = true;
}

// navigate to next connection on right arrow key press
document.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') {
        nextConnection();
    } else if (event.key === 'ArrowLeft') {
        if (parseInt(id) === 1) {
            return;
        }
        previousConnection();
    }
});

// navigate to next connection when next button is clicked
document.querySelector('#next').addEventListener('click', () => {
    nextConnection();
})

// navigate to previous connection when previous button is clicked
document.querySelector('#previous').addEventListener('click', () => {
    previousConnection();
})
