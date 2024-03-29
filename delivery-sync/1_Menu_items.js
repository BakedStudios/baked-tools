function createMenus() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Baked Tools')
      .addItem('Sync Items From SG', 'showCustomDialog')
      .addItem('Create Draft Email', 'createDraftTest')
      .addSeparator()
      .addItem('Push Notes to SG', 'pushToSG')
      .addToUi();
}

function createDraftTest() {
  // Attempt to run the function, handle prerequisites check
  const errorMessage = checkPrerequisites();
  if (errorMessage === '') {
    showEmailDraftDialog();
  } else {
    // Show specific error message based on what is missing
    SpreadsheetApp.getUi().alert(errorMessage);
  }
}

function checkPrerequisites() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Submission');
  const deliveryLocation = sheet.getRange('C1').getValue();
  const submissionPurpose = sheet.getRange('E3').getValue();
  
  let errorMessage = '';

  // Check if Delivery Location is not selected
  if (deliveryLocation === "Select Value") {
    errorMessage += 'Please select delivery location in cell C1.';
  }
  
  // Check if Submission Purpose is not selected
  if (submissionPurpose === "Select Value") {
    // Add a space if there's already an error message for another field
    if (errorMessage.length > 0) errorMessage += ' ';
    errorMessage += 'Please select what you\'re submitting these shots for in cell E3.';
  }

  return errorMessage;
}

function onInstall(e) {
  createMenus();
}

function onOpen(e) {
  createMenus();
}
