/* global Office, FormatAndSign, ND_LOGO_B64, INC_LOGO_B64 */

function notify(item, type, message) {
  try {
    item.notificationMessages.replaceAsync("formatAndSign", {
      type: type,
      message: message.slice(0, 150),
      icon: "Icon.16",
      persistent: false
    });
  } catch (e) { /* ignore */ }
}

function promisify(fn) {
  return new Promise(function (resolve, reject) {
    fn(function (result) {
      if (result.status === Office.AsyncResultStatus.Succeeded) resolve(result.value);
      else reject(result.error);
    });
  });
}

function ensureInlineImage(item, existing, name, base64) {
  var has = existing.some(function (a) { return a.name === name && a.isInline; });
  if (has) return Promise.resolve();
  return promisify(function (cb) {
    item.addFileAttachmentFromBase64Async(base64, name, { isInline: true }, cb);
  });
}

function formatAndSign(event) {
  var item = Office.context.mailbox.item;
  var done = function () { if (event && event.completed) event.completed(); };

  promisify(function (cb) { item.body.getAsync(Office.CoercionType.Html, cb); })
    .then(function (html) {
      var result = FormatAndSign.transform(html);
      if (result.alreadyFormatted) {
        notify(item, "informationalMessage", "This message is already formatted and signed.");
        return null;
      }
      var attachmentsStep = Promise.resolve();
      if (result.addedSignature) {
        attachmentsStep = promisify(function (cb) { item.getAttachmentsAsync(cb); })
          .then(function (existing) {
            return ensureInlineImage(item, existing, FormatAndSign.ND_CID, ND_LOGO_B64)
              .then(function () { return ensureInlineImage(item, existing, FormatAndSign.INC_CID, INC_LOGO_B64); });
          });
      }
      return attachmentsStep.then(function () {
        return promisify(function (cb) {
          item.body.setAsync(result.html, { coercionType: Office.CoercionType.Html }, cb);
        });
      }).then(function () {
        notify(item, "informationalMessage",
          result.addedSignature ? "Formatted in Aptos and signature added." : "Formatted in Aptos (signature was already there).");
      });
    })
    .catch(function (err) {
      notify(item, "errorMessage", "Format and Sign failed: " + (err && err.message ? err.message : String(err)));
    })
    .then(done, done);
}

Office.onReady(function () {
  if (Office.actions && Office.actions.associate) {
    Office.actions.associate("formatAndSign", formatAndSign);
  }
});

// Fallback for older clients that look up the function globally.
if (typeof window !== "undefined") window.formatAndSign = formatAndSign;
