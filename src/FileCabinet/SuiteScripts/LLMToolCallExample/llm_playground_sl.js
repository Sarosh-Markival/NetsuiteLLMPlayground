/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @description Modern UI LLM Playground Suitelet
 */
define(["N/file", "N/ui/serverWidget"], function (file, serverWidget) {
  /**
   * Serves the HTML UI template
   * @param {Object} context - The context object
   */
  function onRequest(context) {
    // Create the form
    const form = serverWidget.createForm({
      title: "LLM Playground",
    });

    // Add client script
    form.clientScriptModulePath = "./llm_playground_cl.js";

    // Add inline HTML field to contain our UI
    const htmlField = form.addField({
      id: "custpage_html_container",
      type: serverWidget.FieldType.INLINEHTML,
      label: "HTML Container",
    });

    // Load and inject the HTML template
    const htmlTemplate = file.load({
      id: "SuiteScripts/LLMToolCallExample/new_llm_playground_ui.html",
    });

    // Set the entire HTML content
    htmlField.defaultValue = htmlTemplate.getContents();

    context.response.writePage(form);
  }

  return {
    onRequest: onRequest,
  };
});
