// This function is updated to show a custom dialog for inputs
function showCustomDialog() {
  var html = HtmlService.createHtmlOutputFromFile('DialogForm')
      .setWidth(400)
      .setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'Sync Items From SG');
}

// Function to process form data from the custom dialog
function processForm(formObject) {
  var projectName = formObject.projectName;

  //set details
  var sheet = SpreadsheetApp.getActiveSheet();

  //set URL
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var url = ss.getUrl();
  sheet.getRange('Emailer!I2').setValue(url);

  var fileId = SpreadsheetApp.getActiveSpreadsheet().getId();
  var file = DriveApp.getFileById(fileId);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
  file.addEditor('baked-sheet-sync@appspot.gserviceaccount.com');

  var sheetName = SpreadsheetApp.getActiveSpreadsheet().getName(); 
  var params = {
    "project_name": projectName,
    "sheet_name": sheetName,
  };

  //set alias at Contacts!D2
  sheet.getRange('Contacts!D2').setValue(projectName + "@wearebaked.com");

  //set sheet name at A1
  sheet.getRange('Submission!A1').setValue(sheetName);

  var queryString = Object.keys(params).map(key => key + '=' + encodeURIComponent(params[key])).join('&');
  
  var response = UrlFetchApp.fetch("https://us-central1-send-to-client-app.cloudfunctions.net/delivery-sync?" + queryString, {"muteHttpExceptions": true});
  
  var statusCode = response.getResponseCode();
  var content = response.getContentText();
  
  if (statusCode !== 200) {
    Logger.log("Error (status " + statusCode + "): " + content);
    SpreadsheetApp.getUi().alert('An error occurred: ' + content);
  } else {
    Logger.log("Success: " + content);
  }
}