/*global supabase*/
const API_URL = import.meta.env.VITE_API_URL;
const ANON_KEY = import.meta.env.VITE_ANON_KEY;
const supabaseClient = supabase.createClient(API_URL, ANON_KEY);

const queryState = {
    sort: [],
    filters: []
}

supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") {
        loadConnections()
            .then(res => {
                const tableEl = document.querySelector('table')

                replaceRows(res.data, tableEl)

                // document.querySelector('#search').addEventListener('input', (e) => connectionsList.search(e.target.value))

                // add an event listener to each column to enable sorting
                document.querySelectorAll('th').forEach((el) => {
                    el.addEventListener('click', function () { handleSort(tableEl, this, this.id) })
                })

                // add event listeners for filtering
                document.querySelector('#filters').addEventListener('submit', async function (event) {
                    event.preventDefault()

                    queryState.filters = []

                    for (const filter of new FormData(this)) {
                        if (filter[1] === '') {
                            continue
                        }
                        queryState.filters.push([filter[0], '%' + filter[1] + '%'])
                    }
                    console.log('query state', queryState)

                    let query = supabaseClient
                        .from('connections')
                        .select('*')

                    for (const filter of queryState.filters) {
                        query = query.ilike(...filter)
                    }

                    if (queryState.sort.length > 0) {
                        query = query.order(...queryState.sort)
                    }

                    const res = await query

                    if (res.error) {
                        console.error(res.error.message)
                    }

                    console.log('filter results', res.data)

                    replaceRows(res.data, tableEl)
                })

            })
            .then(() => document.body.classList.remove('loading'))
    }
})

/**
 * update table when a column sort is selected
 * @param {HTMLTableElement} tableEl the main table element
 * @param {HTMLElement} colEl the element of the selected column header
 * @param {string} col the column name to sort by
 */
async function handleSort(tableEl, colEl, col) {
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

    queryState.sort = [col, { ascending: asc }]
    console.log('query state', queryState)

    let query = supabaseClient
        .from('connections')
        .select('*')
        .order(...queryState.sort)

    if (queryState.filters.length > 0) {
        for (const filter of queryState.filters) {
            query = query.ilike(...filter)
        }
    }

    const res = await query

    if (res.error) {
        console.error(res.error.message)
    }

    replaceRows(res.data, tableEl)
}

/**
 * load connections for current user
 */
async function loadConnections() {
    // supabase filters by user
    const res = await supabaseClient
        .from('connections')
        .select('*', {
            count: 'estimated'
        });

    if (res.error) {
        console.error(res.error);
        // document.querySelector('#message').textContent = res.error.message
        throw res.error.message
        // TODO format error message on page
    }

    return res
}

/**
 * insert a new row into the provided table element
 * @param {*} row an object of the data to be inserted
 * @param {number} index the position to insert the row
 * @param {HTMLTableElement} table the table element
 * @returns {HTMLTableRowElement}
 */
function insertRow(row, index, table) {
    const rowEl = table.insertRow(index)

    rowEl.innerHTML = `
    <td class="first_name">${row.first_name}</td>
    <td class="last_name">${row.last_name}</td>
    <td class="company">${row.company}</td>
    <td class="position">${row.position || ''}</td>
    <td class="email">${row.email}</td>
    <td class="connected_on">${row.connected_on}</td>
    <a href="/edit.html?id=${row.id}" id="edit-${row.id}" class="block p-2 mx-1 my-3 hover:bg-gray-200 active:bg-gray-300 rounded-md">
        <i class="fas fa-edit"></i>
    </a>
    `

    return rowEl
}

/**
 * remove all rows in the table and add new rows
 * @param {Array<any>} rows new rows to be inserted
 * @param {HTMLTableElement} table the table element
 */
function replaceRows(rows, table) {
    const tbody = table.querySelector('tbody')

    tbody.replaceChildren('')

    rows.forEach((row, index) => insertRow(row, index, tbody))
}
