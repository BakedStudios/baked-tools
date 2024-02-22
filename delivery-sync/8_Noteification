function updateDate(e) {
  // Check if the edit happened on the "Submission" sheet and within the specified range
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "Submission" || e.range.columnStart !== 7 || e.range.rowStart < 3 || e.range.rowStart > 50) {
    return; // Exit the function if the edit is not within the "Submission" sheet and G3:G50 range
  }

  var range = sheet.getRange("G3:G50");
  var dateCell = sheet.getRange("G1");
  
  var values = range.getValues();
  var isEmpty = true;
  
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] !== "") {
      isEmpty = false;
      dateCell.setValue(new Date());
      break; // Exit loop after setting value and flag
    }
  }

  if (isEmpty) {
    dateCell.setValue("00/00");
  }

  // Check if we should send a notification today
  var properties = PropertiesService.getScriptProperties();
  var lastSent = properties.getProperty('lastSent');
  var today = new Date().toDateString();

  if (lastSent !== today) {
    sendNoteification();
    properties.setProperty('lastSent', today); // Update the last sent date
  }
}

function sendNoteification() {
  // Logic to send a notification
  
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var spreadsheetName = spreadsheet.getName();
  var spreadsheetUrl = spreadsheet.getUrl();
  
  var emailSubject = "New Notes for " + spreadsheetName;
  var emailBody = "There are new notes in the spreadsheet '" + spreadsheetName + 
                  "'\nYou can view the spreadsheet here: " + spreadsheetUrl;
  
  MailApp.sendEmail("coordinator@wearebaked.com, cameron@wearebaked.com", emailSubject, emailBody);
}
