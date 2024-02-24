function showEmailDraftDialog() {
  var html = HtmlService.createHtmlOutputFromFile("EmailForm")
    .setWidth(400)
    .setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, "Create Draft Email");
}

//add form entry to sheet
function processEmailForm(formObject) {
  var details = formObject.details;
  var sheet = SpreadsheetApp.getActiveSheet();
  // Log the details from the formObject to the console for debugging purposes
  console.log("Form details:", details);
  sheet.getRange("Emailer!G2").setValue(details);

  //trigger draft creation
  createDraft("Emailer");
}

/**
 * @OnlyCurrentDoc
 */

/**
 * Change these to match the column names you are using for email
 * recipient addresses and email sent column.
 */
const RECIPIENT_COL = "Recipient";
const EMAIL_SENT_COL = "Draft Created";
/**
 */
/**
 * Sends emails from sheet data.
 * @param {string} subjectLine (optional) for the email draft message
 * @param {Sheet} sheet to read data from
 */
function createDraft(sheetName) {
  // Select correct worksheet
  const submissionSheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Submission");

  // Retrieve the value from cell E3 of the "Submission" sheet
  const cellValue = submissionSheet.getRange("E3").getValue();

  // Determine the subjectLine based on the value in cell E3
  const subjectLine = cellValue === "delivery" ? "{{SL2}}" : "{{SL1}}";

  // Gets the draft Gmail message to use as a template
  const emailTemplate = getGmailTemplateFromDrafts_(subjectLine);
  // Select correct worksheet
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (subjectLine === "{{SL2}}") {
    sheet.getRange("A1").setValue("SL2");
  } else {
    sheet.getRange("A1").setValue("SL1");
  }

  // Gets the data from the passed sheet
  const dataRange = sheet.getDataRange();
  // Fetches displayed values for each row in the Range HT Andrew Roberts
  // https://mashe.hawksey.info/2020/04/a-bulk-email-mail-merge-with-gmail-and-google-sheets-solution-evolution-using-v8/#comment-187490
  // @see https://developers.google.com/apps-script/reference/spreadsheet/range#getdisplayvalues
  const data = dataRange.getDisplayValues();

  // Assumes row 1 contains our column headings
  const heads = data.shift();

  // Gets the index of the column named 'Email Status' (Assumes header names are unique)
  // @see http://ramblings.mcpher.com/Home/excelquirks/gooscript/arrayfunctions
  const emailSentColIdx = heads.indexOf(EMAIL_SENT_COL);

  // Converts 2d array into an object array
  // See https://stackoverflow.com/a/22917499/1027723
  // For a pretty version, see https://mashe.hawksey.info/?p=17869/#comment-184945
  const obj = data.map((r) =>
    heads.reduce((o, k, i) => ((o[k] = r[i] || ""), o), {}),
  );

  // Creates an array to record created drafts
  const out = [];

  // Loops through all the rows of data
  obj.forEach(function (row, rowIdx) {
    // Only create drafts if cell is blank and not hidden by a filter
    if (row[EMAIL_SENT_COL] == "") {
      try {
        const msgObj = fillInTemplateFromObject_(emailTemplate.message, row);

        // See https://developers.google.com/apps-script/reference/gmail/gmail-app#sendEmail(String,String,String,Object)
        // If you need to send emails with unicode/emoji characters change GmailApp for MailApp
        // Uncomment advanced parameters as needed (see docs for limitations)
        GmailApp.createDraft(row[RECIPIENT_COL], msgObj.subject, msgObj.text, {
          htmlBody: msgObj.html,
          // bcc: 'a.bbc@email.com',
          // cc: 'a.cc@email.com',
          // from: 'an.alias@email.com',
          // name: 'name of the sender',
          // replyTo: 'a.reply@email.com',
          // noReply: true, // if the email should be sent from a generic no-reply email address (not available to gmail.com users)
          attachments: emailTemplate.attachments,
          inlineImages: emailTemplate.inlineImages,
        });
        // Edits cell to record email sent date
        out.push([new Date()]);
      } catch (e) {
        // modify cell to record error
        out.push([e.message]);
      }
    } else {
      out.push([row[EMAIL_SENT_COL]]);
    }
  });

  // Updates the sheet with new data
  sheet.getRange(2, emailSentColIdx + 1, out.length).setValues(out);

  /**
   * Get a Gmail draft message by matching the subject line.
   * @param {string} subject_line to search for draft message
   * @return {object} containing the subject, plain and html message body and attachments
   */
  function getGmailTemplateFromDrafts_(subject_line) {
    try {
      // get drafts
      const drafts = GmailApp.getDrafts();
      // filter the drafts that match subject line
      const draft = drafts.filter(subjectFilter_(subject_line))[0];
      // get the message object
      const msg = draft.getMessage();

      // Handles inline images and attachments so they can be included in the merge
      // Based on https://stackoverflow.com/a/65813881/1027723
      // Gets all attachments and inline image attachments
      const allInlineImages = draft
        .getMessage()
        .getAttachments({
          includeInlineImages: true,
          includeAttachments: false,
        });
      const attachments = draft
        .getMessage()
        .getAttachments({ includeInlineImages: false });
      const htmlBody = msg.getBody();

      // Creates an inline image object with the image name as key
      // (can't rely on image index as array based on insert order)
      const img_obj = allInlineImages.reduce(
        (obj, i) => ((obj[i.getName()] = i), obj),
        {},
      );

      //Regexp searches for all img string positions with cid
      const imgexp = RegExp('<img.*?src="cid:(.*?)".*?alt="(.*?)"[^>]+>', "g");
      const matches = [...htmlBody.matchAll(imgexp)];

      //Initiates the allInlineImages object
      const inlineImagesObj = {};
      // built an inlineImagesObj from inline image matches
      matches.forEach(
        (match) => (inlineImagesObj[match[1]] = img_obj[match[2]]),
      );

      return {
        message: {
          subject: subject_line,
          text: msg.getPlainBody(),
          html: htmlBody,
        },
        attachments: attachments,
        inlineImages: inlineImagesObj,
      };
    } catch (e) {
      throw new Error("Oops - can't find Gmail draft");
    }

    /**
     * Filter draft objects with the matching subject linemessage by matching the subject line.
     * @param {string} subject_line to search for draft message
     * @return {object} GmailDraft object
     */
    function subjectFilter_(subject_line) {
      return function (element) {
        if (element.getMessage().getSubject() === subject_line) {
          return element;
        }
      };
    }
  }

  /**
   * Fill template string with data object
   * @see https://stackoverflow.com/a/378000/1027723
   * @param {string} template string containing {{}} markers which are replaced with data
   * @param {object} data object used to replace {{}} markers
   * @return {object} message replaced with data
   */
  function fillInTemplateFromObject_(template, data) {
    // We have two templates one for plain text and the html body
    // Stringifing the object means we can do a global replace
    let template_string = JSON.stringify(template);

    // Token replacement
    template_string = template_string.replace(/{{[^{}]+}}/g, (key) => {
      return escapeData_(data[key.replace(/[{}]+/g, "")] || "");
    });
    return JSON.parse(template_string);
  }

  /**
   * Escape cell data to make JSON safe
   * @see https://stackoverflow.com/a/9204218/1027723
   * @param {string} str to escape JSON special characters from
   * @return {string} escaped string
   */
  function escapeData_(str) {
    return str
      .replace(/[\\]/g, "\\\\")
      .replace(/[\"]/g, '\\"')
      .replace(/[\/]/g, "\\/")
      .replace(/[\b]/g, "\\b")
      .replace(/[\f]/g, "\\f")
      .replace(/[\n]/g, "\\n")
      .replace(/[\r]/g, "\\r")
      .replace(/[\t]/g, "\\t");
  }
}
