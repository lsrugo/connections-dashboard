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

    const linkedinUrl = encodeURI(`https://www.linkedin.com/search/results/people/?company=${row.company}&firstName=${row.first_name}&lastName=${row.last_name}`)
    const googleUrl = encodeURI(`https://www.google.com/search?q=${row.first_name}+${row.last_name}+${row.company}`)

    rowEl.innerHTML = `
    <td>${row.first_name}</td>
    <td>${row.last_name}</td>
    <td class="truncate max-w-xs">${row.company}</td>
    <td class="truncate max-w-xs">${row.position || ''}</td>
    <td class="truncate max-w-xs">${row.email}</td>
    <td class="truncate">${row.connected_on}</td>
    <div class="flex items-center p-2">
        <a href="${linkedinUrl}" target="_blank" rel="noopener noreferrer"
            class="block p-2 hover:bg-gray-200 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
        </a>
        <a href="${googleUrl}" target="_blank" rel="noopener noreferrer"
            class="block p-2 fill-current text-black hover:bg-gray-200 rounded">
            <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                    <path d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                    <path d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                    <path d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
            </svg>
        </a>
        <a href="/edit.html?id=${row.id}" id="edit-${row.id}" class="block p-2 hover:bg-gray-200 active:bg-gray-300 rounded-md text-xl grid">
            <i class="fas fa-edit m-auto"></i>
        </a>
    </div>
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
