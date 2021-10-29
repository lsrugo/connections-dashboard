/*global supabase, Chart, randomColor*/
import Papa from "papaparse";

const API_URL = import.meta.env.VITE_API_URL;
const ANON_KEY = import.meta.env.VITE_ANON_KEY;
const supabaseClient = supabase.createClient(API_URL, ANON_KEY);

supabaseClient.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_IN") {
    // TODO filter by date imported/created
    // supabase already filters by user

    Promise.all([
      populateCards(),
      createPositionsChart(),
      createDatesChart(),
      createCompaniesList(),
    ]).then(() => {
      console.log('done')
      document.body.classList.remove('loading')
    }).catch(err => {
      console.error(err);
      // document.querySelector('#message').textContent = err.message;
    })
  }
})

function populateCards() {
  return supabaseClient
    .from('connections')
    .select('id', {
      count: 'estimated'
    })
    .limit(1)
    .single()
    .then(res => {
      if (res.error) {
        throw res.error
      }

      const formattedCount = res.count.toLocaleString()
      document.querySelector('#total-connections').textContent = formattedCount
    })
}

function createPositionsChart() {
  return supabaseClient
    .from('positions_count')
    .select('*')
    // .limit(1)
    .single()
    .then(res => {
      if (res.error) {
        throw res.error
      }

      const positions = res.data

      const total = positions['total']
      delete positions['total']

      positions['Other'] = Object.values(positions).reduce((previous, current) => previous - current, total)

      const positionsSorted = Object.entries(positions).sort((a, b) => b[1] - a[1])
      // TODO add popup to expand 'other'

      const colors = randomColor({
        count: positionsSorted.length
      })

      const chartData = {
        labels: positionsSorted.map(pos => pos[0]),
        datasets: [
          {
            label: 'Positions',
            data: positionsSorted.map(pos => pos[1]),
            backgroundColor: colors
          }
        ]
      }

      const config = {
        type: 'pie',
        data: chartData
      }

      new Chart(
        document.getElementById('positionsChart'),
        config
      );
    })
}

function createDatesChart() {
  const dates = {}

  // const options = { month: 'long', timeZone: 'UTC' };
  // const dateFormatter = new Intl.DateTimeFormat('en-US', options);

  return supabaseClient
    .from('dates_count')
    .select('*')
    .then(res => {
      if (res.error) {
        throw res.error
      }

      const datesCount = res.data

      // organize date counts into object
      for (const item of datesCount) {
        const date = new Date(item['month'])
        const year = date.getFullYear()
        const month = date.getUTCMonth()

        if (!dates[year]) {
          dates[year] = []
        }

        dates[year][month] = item['count'];
      }

      // reformat to fit chart
      const datasets = Object.entries(dates).map(([year, months]) => {
        // TODO use set colors
        const color = randomColor()
        return {
          label: String(year),
          data: months,
          backgroundColor: color,
          borderColor: color
        }
      })

      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

      // TODO fix config
      const config = {
        type: 'line',
        data: {
          labels: months,
          datasets: datasets
        },
        options: {
          elements: {
            line: {
              tension: 0.4,
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              align: 'end'
            }
          }
        }
      }

      new Chart(
        document.getElementById('datesChart'),
        config
      );
    })
}

function createCompaniesList() {
  return supabaseClient
    .from('companies_count')
    .select('*')
    .then(res => {
      if (res.error) {
        throw res.error
      }

      const table = document.querySelector('#companies-list')
      for (const co of res.data.slice(0, 10)) {
        const row = document.createElement('tr')
        const coName = document.createElement('td')
        coName.textContent = co['company']
        const coNum = document.createElement('td')
        coNum.textContent = co['count']
        coNum.classList.add('text-center')
        row.append(coName, coNum)
        table.append(row)
      }

      const showMore = document.querySelector('#companies-list-more')
      const showLess = document.querySelector('#companies-list-less')

      showMore.addEventListener('click', () => {
        for (const co of res.data.slice(10, 25)) {
          const row = document.createElement('tr')
          const coName = document.createElement('td')
          coName.textContent = co['company']
          const coNum = document.createElement('td')
          coNum.textContent = co['count']
          coNum.classList.add('text-center')
          row.append(coName, coNum)
          table.append(row)
        }

        showMore.disabled = true
        showLess.disabled = false
      })

      showLess.addEventListener('click', () => {
        while (table.childElementCount > 10) {
          table.removeChild(table.lastElementChild)
        }

        showMore.disabled = false
        showLess.disabled = true
      })
    })
}

// handle importing csv
document.querySelector("#import").addEventListener("change", (e) => {
  console.log("file selected");
  importConnections(e.target.files[0]);
});

/**
 *
 * @param {File} file The CSV file being imported
 */
function importConnections(file) {
  const startingString =
    'Notes:\n"When exporting your connection data, you may notice that some of the email addresses are missing. You will only see email addresses for connections who have allowed their connections to see or download their email address using this setting https://www.linkedin.com/psettings/privacy/email. You can learn more here https://www.linkedin.com/help/linkedin/answer/261"\n\n';
  Papa.parse(file, {
    header: true,
    beforeFirstChunk: (chunk) => {
      if (chunk.startsWith(startingString)) {
        return chunk.slice(startingString.length);
      }
    },
    complete: (results) => {
      console.log(results);
      // TODO handle errors

      const user_id = supabaseClient.auth.user().id

      const data = results.data.map(val => {
        return {
          first_name: val['First Name'],
          last_name: val['Last Name'],
          email: val['Email Address'],
          company: val['Company'],
          position: val['Position'],
          connected_on: val['Connected On'],
          user_id: user_id
        }
      });

      supabaseClient.from('connections')
        .insert(data)
        .then(res => {
          if (res.error) {
            console.error(res.error)
          } else {
            console.log('success', res.data)
          }
        })
    }
  });
}
