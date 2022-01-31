import Papa from "papaparse";
import supabaseClient from './login.js'

// handle importing csv
document.querySelector("#import").addEventListener("change", (e) => {
    console.log("file selected");
    importConnections(e.target.files[0]);
  });
  
  /**
   *
   * @param {File} file The CSV file being imported
   */
  async function importConnections(file) {
    document.body.classList.add('loading');

    if (file.type === "application/zip") {
      console.log(file.type);

      // TODO: check for import browser support
      const JSZip = await import("https://cdn.skypack.dev/jszip");
      const zip = JSZip.default();
      // TODO: add error handling
      const zipFile = await zip.loadAsync(file);
      file = await zipFile.file("Connections.csv").async("blob");
      if (!file) {
        document.body.classList.remove('loading');
        throw new Error("No Connections.csv file found in zip");
      }
    }
  
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
  
        if (results.errors.length > 0) {
          const lineNumbers = results.errors.map(error => error.row).join(', ')
          alert(`Import failed on ${results.errors.length > 1 ? 'lines' : 'line'} ${lineNumbers}. Please correct the errors and try again.`)
          document.body.classList.remove('loading')
          return;
        }
  
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
              window.location.reload();
            }
            document.body.classList.remove('loading')
          })
      }
    });
  }