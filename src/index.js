import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";

const API_URL = "https://uzuarjwobeobconcjdkb.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYzMjA5MjUwMSwiZXhwIjoxOTQ3NjY4NTAxfQ.wcnGs329dCulDLOTPcLpEEY8zDREbXi-9mXduoq8npQ";
const supabase = createClient(API_URL, ANON_KEY);

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

      supabase.from('Connections')
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
