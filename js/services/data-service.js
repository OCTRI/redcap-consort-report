import assert from 'assert';
import axios from 'axios';
import uuid from 'uuid/v4';

export const ENDPOINTS = {
  REPORT_DATA: 'lib/data.php',
  REPORT_CONFIG: 'lib/settings.php'
};

/**
 * Constructs a service that fetches data for the current project from REDCap.
 *
 * @param {Object} assetUrls - key/value pairs where the key is a relative file path
 *   like `lib/data.php`, and the value is the corresponding external module URL
 *   like `http://localhost/redcap/api/?type=module&prefix=consort-report&page=lib%2Fdata&pid=42`
 * @return {Object} an object encapsulating REDCap HTTP requests
 */
export default function createDataService(assetUrls) {
  assert(assetUrls, 'Asset URL object is required');
  Object.keys(ENDPOINTS).forEach(key => {
    const endpoint = ENDPOINTS[key];
    assert(assetUrls[endpoint], `A URL for ${endpoint} is required`)
  });

  return {
    reportDataUrl: assetUrls[ENDPOINTS.REPORT_DATA],
    reportConfigUrl: assetUrls[ENDPOINTS.REPORT_CONFIG],

    /**
     * Extracts data returned by the request.
     * @param {Promise->Object} response - an axios response object.
     * @return {Promise->Object} the response's data
     * @private
     */
    _extractData(response) {
      return response.data;
    },

    /**
     * Adds unique IDs to existing report summaries.
     *
     * @param {Object[]} reportSummaries - array of report summaries.
     */
    _insertUuids(reportSummaries) {
      return reportSummaries.map(summaryConfig => {
        summaryConfig.id = summaryConfig.id || uuid();
        return summaryConfig;
      });
    },

    _makeRequest(url, data, options) {
      return axios.post(url, data, options).then(this._extractData);
    },

    /**
     * Get a report summary that includes the total number of records for a report.
     *
     * @return {Promise} A promise that resolves to an object with the following keys:
     *   - reportId: The report ID.
     *   - totalRecords: The total number of records for a report.
     */
    fetchReportSummary() {
      return this._makeRequest(this.reportDataUrl).then(this._insertUuids);
    },

    /**
     * Post report summary for saving to report config.
     * @param {Object} reportSummary Data for a report summary.
     * @return {Promise->Object} the response's report summary data
     */
    saveReportSummary(reportSummary, editing) {
      const data = {
        reportSummary: JSON.stringify({ reportSummary }),
        editing: editing
      };
      const options = { timeout: 5000 };
      return this._makeRequest(`${this.reportConfigUrl}&action=saveReportSummary`, data, options);
    },

    /**
     * Post report summary for saving to report config.
     * @param {Object} reportSummary Data for a report summary.
     * @return {Promise->Object} the response's report summary data
     */
    saveReportSummaries(reportSummaries, editing) {
      const data = { reportSummaries: JSON.stringify({ reportSummaries }) };
      const options = { timeout: 5000 };
      return this._makeRequest(`${this.reportConfigUrl}&action=saveReportSummaries`, data, options);
    },

    /**
     * Get all of the reports for the project.
     * @return {Promise->Object} list of reports.
     */
    getReports() {
      return this._makeRequest(`${this.reportDataUrl}&action=getReports`);
    },

    /**
     * @param {Number} The report id
     * @return {Promise->Object} list of field names and labels for the current project
     */
    getReportFields(reportId) {
      return this._makeRequest(`${this.reportDataUrl}&action=getReportFields&reportId=${reportId}`);
    }
  };
}
