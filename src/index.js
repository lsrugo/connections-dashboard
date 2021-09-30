/*global supabase, Chart, randomColor*/
import Papa from "papaparse";

const API_URL = "https://uzuarjwobeobconcjdkb.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYzMjA5MjUwMSwiZXhwIjoxOTQ3NjY4NTAxfQ.wcnGs329dCulDLOTPcLpEEY8zDREbXi-9mXduoq8npQ";
const supabaseClient = supabase.createClient(API_URL, ANON_KEY);

async function signIn(email, password) {
  const { user, error } = await supabaseClient.auth.signIn({
    email: email,
    password: password
  })
  if (error) {
    console.error(error)
  } else {
    console.log(user)
  }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log(event, session)
  if (event === "SIGNED_IN") {
    console.log('signed in as', session.user.email);
    // hide sign in element if signed in
    // document.querySelector('#signin').classList.add('hidden');
  }
})

signIn('lsrugo@hotmail.com', '123456');

loadConnections()
  .then(createPositionsChart)
  .then(createDatesChart)
  .then(() => document.querySelector('#message').textContent = '')

// load connections for current user
async function loadConnections() {
  // TODO make this more specific
  const { data, error } = await supabaseClient
    .from('Connections')
    .select('Position, "Connected On"');

  if (error) {
    console.error(error);
    document.querySelector('#message').textContent = error.message
    // TODO format error message on page
  }

  return data
}

function createPositionsChart(data) {
  document.querySelector('#message').textContent = 'Loading...'

  const positions = {};

  // count number of connections in each position
  for (const item of data) {
    let position = item['Position'].toLowerCase()
    // let position = item['Position']
    if (position.includes('ceo') || position.includes('chief executive officer')) {
      position = 'CEO'
    } else if (position.includes('cfo') || position.includes('chief financial officer')) {
      position = 'CFO'
    } else if (position.includes('coo') || position.includes('chief operating officer')) {
      position = 'COO'
    } else if (position.includes('cto') || position.includes('chief technology officer')) {
      position = 'CTO'
    } else if (position === 'president') {
      position = 'President'
    } else if (position.includes('sales')) {
      position = 'Sales'
    } else if (position.includes('marketing')) {
      position = 'Marketing'
    } else if (position.includes('business development')) {
      position = 'Business Development'
    } else if (position.includes('vice president')) {
      position = 'Vice President'
    } else if (position.includes('founder')) {
      position = 'Founder' // maybe don't need this one
    } else {
      position = 'Other'
    }
    positions[position] ? positions[position] += 1 : positions[position] = 1;
  }

  // TODO: add popup to expand 'other'
  console.log(positions)

  const labelsList = []
  const numbersList = []

  // reformat to fit chart
  for (const [key, value] of Object.entries(positions)) {
    if (value < 2) {
      // skip positions with only 1 connection
      continue
    }
    labelsList.push(key)
    numbersList.push(value)
  }

  console.log('number of positons', numbersList.length)
  console.log('number of connections', data.length)

  const colors = randomColor({
    count: numbersList.length
  })

  const chartData = {
    labels: labelsList,
    datasets: [
      {
        label: 'Positions',
        data: numbersList,
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

  // pass original data to next function
  return data
}

function createDatesChart(data) {
  const dates = {}

  console.log(data)

  const options = { month: 'long', year: 'numeric' };
  const dateFormatter = new Intl.DateTimeFormat('en-US', options);

  // count number of connections for each month
  for (const item of data) {
    const rawDate = item['Connected On']
    const date = new Date(rawDate)
    // TODO: figure out time zone issues
    date.setDate(1) // set all dates to first of month
    const dateString = date.toISOString()

    dates[dateString] ? dates[dateString] += 1 : dates[dateString] = 1;
  }

  console.log(dates)

  const labelsList = []
  const numbersList = []

  // sort dates list
  const datesList = Object.entries(dates).sort((a, b) => {
    return new Date(a[0]) - new Date(b[0])
  })

  // reformat to fit chart
  for (const [key, value] of datesList) {
    // format date to month + year
    labelsList.push(dateFormatter.format(Date.parse(key)))
    numbersList.push(value)
  }

  const colors = randomColor({
    count: numbersList.length
  })

  const chartData = {
    labels: labelsList,
    datasets: [
      {
        label: 'Connections',
        data: numbersList,
        backgroundColor: colors
      }
    ]
  }

  const config = {
    type: 'bar',
    data: chartData
  }

  new Chart(
    document.getElementById('datesChart'),
    config
  );

  // pass original data to next function
  return data
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

      supabaseClient.from('Connections')
        .insert(results.data)
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
