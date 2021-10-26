/*global supabase*/
const API_URL = import.meta.env.VITE_API_URL;
const ANON_KEY = import.meta.env.VITE_ANON_KEY;
const supabaseClient = supabase.createClient(API_URL, ANON_KEY);

let id = new URLSearchParams(location.search).get('id');

let count = await supabaseClient.from('connections').select('*', { count: 'estimated' });
count = count.count

loadSelectedConnection(id);

document.querySelector('#edit-form').addEventListener('submit', saveConnection);

function loadSelectedConnection(id) {
    // leave form blank if no id is provided
    if (!id) {
        return;
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

            document.querySelector('#progress').textContent = `${id} of ${count}`;

            // fill in form values with res.data
            for (const input of document.querySelectorAll('#edit-form input')) {
                input.value = res.data[input.name];
            }

            document.querySelector('#edit-form textarea').innerText = res.data.notes || '';
        })
}

function saveConnection(event) {
    event.preventDefault();

    console.log('saving form', id)

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
