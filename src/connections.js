import supabaseClient from './login.js'

const queryState = {
    sort: [],
    filters: [],
    pageSize: 100,
    pageNumber: 1
}

supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") {
        loadConnections()
            .then(() => {
                const tableEl = document.querySelector('table')

                // document.querySelector('#search').addEventListener('input', (e) => connectionsList.search(e.target.value))

                // add an event listener to each column to enable sorting
                document.querySelectorAll('th').forEach((el) => {
                    el.addEventListener('click', function () { handleSort(tableEl, this, this.id) })
                })

                // add event listener for filter submit
                document.querySelector('#filters').addEventListener('submit', handleFilter)
                // refresh the table when the filters are reset
                document.querySelector('#reset-filters').addEventListener('click', handleFilterReset)

                const pageNav = document.querySelector('#page-nav')
                pageNav.querySelector('#next').addEventListener('click', nextPage)
                pageNav.querySelector('#prev').addEventListener('click', prevPage)
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
    queryState.pageNumber = 1

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

    await loadConnections()
}

async function handleFilter(event) {
    // prevent page reload
    event.preventDefault()

    queryState.pageNumber = 1
    queryState.filters = []

    for (const filter of new FormData(this)) {
        if (filter[1] === '') {
            continue
        }
        queryState.filters.push([filter[0], '%' + filter[1] + '%'])
    }
    console.log('query state', queryState)

    const res = await loadConnections()

    console.log('filter results', res.data)
}

async function handleFilterReset() {
    queryState.pageNumber = 1
    queryState.filters = []
    await loadConnections()
}

async function nextPage() {
    queryState.pageNumber++
    await loadConnections()
}

async function prevPage() {
    if (queryState.pageNumber > 1) {
        queryState.pageNumber--
        await loadConnections()
    }
}

/**
 * load connections for current user with filters and sort
 */
async function loadConnections() {
    const resultsEl = document.querySelector('#results-count')
    resultsEl.textContent = ''

    const startIndex = (queryState.pageNumber - 1) * queryState.pageSize
    const endIndex = startIndex + queryState.pageSize - 1

    // supabase filters by user
    let query = supabaseClient
        .from('connections')
        .select('*', {
            count: 'estimated'
        })
        .range(startIndex, endIndex);

    for (const filter of queryState.filters) {
        query = query.ilike(...filter)
    }

    if (queryState.sort.length > 0) {
        query = query.order(...queryState.sort)
    }

    const res = await query

    if (res.error) {
        console.error(res.error);
        // document.querySelector('#message').textContent = res.error.message
        throw res.error.message
        // TODO format error message on page
    }

    const tableEl = document.querySelector('table')
    replaceRows(res.data, tableEl)

    // show number of results
    if (res.count === 0) {
        resultsEl.textContent = 'No results found'
    } else if (res.count === 1) {
        resultsEl.textContent = 'Showing 1 result'
    } else {
        resultsEl.textContent = `Showing ${res.data.length} of ${res.count} results`
    }

    document.querySelector('#page-num').textContent = 'Page ' + String(queryState.pageNumber)
    // disable prev page if on first page
    document.querySelector('#prev').disabled = queryState.pageNumber === 1
    // disable next page if on last page
    document.querySelector('#next').disabled = res.data.length < queryState.pageSize

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
