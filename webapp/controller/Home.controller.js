sap.ui.define([
	"com/infocus/purchaseApplication/controller/BaseController",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/viz/ui5/api/env/Format",
	"com/infocus/purchaseApplication/libs/html2pdf.bundle",
	"jquery.sap.global"
], function(BaseController, Fragment, Filter, FilterOperator, JSONModel, MessageBox, Format, html2pdf_bundle, jQuery) {
	"use strict";

	return BaseController.extend("com.infocus.purchaseApplication.controller.Home", {

		/*************** on Load Functions *****************/
		onInit: function() {

			this._initializeApp();

		},
		_initializeApp: function() {
			try {
				this._initializeAppData();
				this._updateGlobalDataModel();
			} catch (err) {
				console.error("Error initializing the app:", err);
				sap.m.MessageBox.error("An error occurred during app initialization. Please contact support.");
			}
		},
		_initializeAppData: function() {
			this.getSupplierMasterParametersData();
		},
		_updateGlobalDataModel: function() {
			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			if (!oGlobalDataModel) {
				console.error("Global data model is not available.");
				sap.m.MessageToast.show("Unable to access global data model.");
				return;
			}

			if (oGlobalDataModel) {
				oGlobalDataModel.setProperty("/selectedTabText", "All Supplier Turnover");
				oGlobalDataModel.setProperty("/isChartFragment1Visible", true);
				oGlobalDataModel.setProperty("/isChartFragment2Visible", false);
				oGlobalDataModel.setProperty("/isChartFragment3Visible", true);
				oGlobalDataModel.setProperty("/isChartFragment4Visible", false);
				oGlobalDataModel.setProperty("/isChartFragment5Visible", true);
				oGlobalDataModel.setProperty("/isChartFragment6Visible", false);
				oGlobalDataModel.setProperty("/isChartFragment7Visible", true);
				oGlobalDataModel.setProperty("/isChartFragment8Visible", false);

			} else {
				console.error("Global data model is not available.");
			}
		},
		validateInputs: function() {
			var oComponent = this.getOwnerComponent();
			var oGlobalData = oComponent.getModel("globalData").getData();
			var oSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();
			var oSelectedTabText = oGlobalData.selectedTabText;
			var oView = this.getView();

			// Map input IDs to friendly field names
			var mFieldNames = {
				"_supplierInputId": "Supplier",
				"_financialYearInputId": "Fiscal Year",
				"_quarterInputId": "Quarter",
				"_quarterInputYearId": "Quarter Year"
			};

			var getInputIdsToValidate = function() {
				var isSingleCustomer = oSelectedTabText === "Single Supplier Turnover";

				if (isSingleCustomer) {
					return oSelectedIndex === 0 ? ["_supplierInputId", "_financialYearInputId"] : ["_supplierInputId", "_quarterInputId",
						"_quarterInputYearId"
					];
				} else {
					return oSelectedIndex === 0 ? ["_financialYearInputId"] : ["_quarterInputId", "_quarterInputYearId"];
				}
			};

			var bAllValid = true;
			var aEmptyFields = [];
			var aInputIds = getInputIdsToValidate();

			aInputIds.forEach(function(sId) {
				var oInput = oView.byId(sId);
				if (oInput && oInput.getVisible()) {
					var sValue = oInput.getValue();
					var sTrimmedValue = sValue ? sValue.trim() : "";

					if (!sTrimmedValue) {
						oInput.setValueState("Error");
						oInput.setValueStateText("This field cannot be empty.");
						bAllValid = false;

						var sFieldName = mFieldNames[sId] || sId;
						aEmptyFields.push(sFieldName);
					} else {
						oInput.setValueState("None");
					}
				}
			});

			if (aEmptyFields.length > 0) {
				sap.m.MessageBox.error("Please fill the following fields:\n\n" + aEmptyFields.join("\n"));
			}

			return bAllValid;
		},

		/*************** get parameters data *****************/
		getSupplierMasterParametersData: function() {
			var that = this;
			var oModel = this.getOwnerComponent().getModel();
			var oSupplierMasterModel = this.getOwnerComponent().getModel("supplierMasterData");
			var sUrl = "/SUPP_MasterSet";

			if (!oModel || !oSupplierMasterModel) {
				console.error("Required models are not available.");
				sap.m.MessageBox.error("Could not access required models for fetching supplier data.");
				return;
			}

			sap.ui.core.BusyIndicator.show();

			oModel.read(sUrl, {
				success: function(oResponse) {
					sap.ui.core.BusyIndicator.hide();

					var aResults = oResponse && oResponse.results ? oResponse.results : [];

					// Sort suppliers numerically by lifnr (supplier number)
					aResults.sort(function(a, b) {
						var iA = parseInt(a.lifnr, 10);
						var iB = parseInt(b.lifnr, 10);
						return iA - iB;
					});

					oSupplierMasterModel.setData(aResults || []);
					console.log("Supplier master data loaded:", aResults);
				},
				error: function(oError) {
					sap.ui.core.BusyIndicator.hide();
					console.error("Error fetching supplier master data:", oError);

					var sErrorMessage = "Failed to fetch supplier master data.";
					try {
						var oErrorObj = JSON.parse(oError.responseText);
						if (oErrorObj && oErrorObj.error && oErrorObj.error.message && oErrorObj.error.message.value) {
							sErrorMessage = oErrorObj.error.message.value;
						}
					} catch (e) {
						console.warn("Error parsing error response JSON:", e);
					}

					sap.m.MessageBox.error(sErrorMessage);
				}
			});
		},

		/*************** set the inputId & create the fragment *****************/

		handleValueSupplierMaster: function(oEvent) {
			this._supplierInputId = oEvent.getSource().getId();
			var that = this;

			if (!this._oSupplierMasterDialog) {
				Fragment.load({
					id: that.getView().getId(),
					name: "com.infocus.purchaseApplication.view.dialogComponent.DialogSupplierMaster",
					controller: that
				}).then(function(oDialog) {
					that._oSupplierMasterDialog = oDialog;
					that.getView().addDependent(oDialog);
					oDialog.open();
				}).catch(function(oError) {
					console.error("Error loading Supplier Master Dialog:", oError);
					sap.m.MessageBox.error("Failed to open Supplier Master dialog.");
				});
			} else {
				this._oSupplierMasterDialog.open();
			}
		},
		handleValueFiscalYear: function(oEvent) {
			this._financialYearInputId = oEvent.getSource().getId();
			var that = this;

			if (!this.oOpenDialogFiscalYear) {
				try {
					this.oOpenDialogFiscalYear = sap.ui.xmlfragment("com.infocus.purchaseApplication.view.dialogComponent.DialogFiscalYear", this);
					this.getView().addDependent(this.oOpenDialogFiscalYear);
				} catch (err) {
					console.error("Failed to load Fiscal Year dialog:", err);
					sap.m.MessageBox.error("Failed to open Fiscal Year dialog.");
					return;
				}
			}
			this.oOpenDialogFiscalYear.open();
		},
		handleValueQuarter: function(oEvent) {
			this._quarterInputId = oEvent.getSource().getId();
			var that = this;

			if (!this.oOpenDialogQuarter) {
				try {
					this.oOpenDialogQuarter = sap.ui.xmlfragment("com.infocus.purchaseApplication.view.dialogComponent.DialogQuarter", this);
					this.getView().addDependent(this.oOpenDialogQuarter);
				} catch (err) {
					console.error("Failed to load Quarter dialog:", err);
					sap.m.MessageBox.error("Failed to open Quarter dialog.");
					return;
				}
			}
			this.oOpenDialogQuarter.open();
		},
		handleValueQuarterYear: function(oEvent) {
			this._quarterInputYearId = oEvent.getSource().getId();
			var that = this;

			if (!this.oOpenDialogQuarterYear) {
				try {
					this.oOpenDialogQuarterYear = sap.ui.xmlfragment("com.infocus.purchaseApplication.view.dialogComponent.DialogQuarterYear", this);
					this.getView().addDependent(this.oOpenDialogQuarterYear);
				} catch (err) {
					console.error("Failed to load Quarter Year dialog:", err);
					sap.m.MessageBox.error("Failed to open Quarter Year dialog.");
					return;
				}
			}
			this.oOpenDialogQuarterYear.open();
		},

		/*************** search value within fragment *****************/

		onSearchSupplierMaster: function(oEvent) {
			var sQuery = oEvent.getParameter("newValue");
			var oList = Fragment.byId(this.getView().getId(), "idSupplierMasterList");
			if (!oList) return;

			var oBinding = oList.getBinding("items");
			if (!oBinding) return;

			var aFilters = [];
			if (sQuery) {
				var oFilter1 = new sap.ui.model.Filter("lifnr", sap.ui.model.FilterOperator.Contains, sQuery);
				var oFilter2 = new sap.ui.model.Filter("name1", sap.ui.model.FilterOperator.Contains, sQuery);
				aFilters.push(new sap.ui.model.Filter({
					filters: [oFilter1, oFilter2],
					and: false
				}));
			}

			oBinding.filter(aFilters);
		},
		_handleFiscalYearSearch: function(oEvent) {
			var sQuery = oEvent.getParameter("value");
			var oDialog = oEvent.getSource();

			var aItems = oDialog.getItems();
			aItems.forEach(function(oItem) {
				var sTitle = oItem.getTitle();
				if (sTitle && sTitle.toLowerCase().includes(sQuery.toLowerCase())) {
					oItem.setVisible(true);
				} else {
					oItem.setVisible(false);
				}
			});
		},
		_handleQuarterYearSearch: function(oEvent) {
			var sQuery = oEvent.getParameter("value");
			var oDialog = oEvent.getSource();

			var aItems = oDialog.getItems();
			aItems.forEach(function(oItem) {
				var sTitle = oItem.getTitle();
				if (sTitle && sTitle.toLowerCase().includes(sQuery.toLowerCase())) {
					oItem.setVisible(true);
				} else {
					oItem.setVisible(false);
				}
			});
		},

		/*************** set the each property to globalData & reflect data in input field  *****************/

		onSelectionChangeSupplierMaster: function(oEvent) {
			var oList = oEvent.getSource();
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var aSelectedSupplierIDs = oGlobalModel.getProperty("/selectedSupplierIDs") || [];
			var aSelectedSupplierNames = oGlobalModel.getProperty("/selectedSupplierNames") || [];

			var aAllItems = oList.getItems();
			aAllItems.forEach(function(oItem) {
				var sID = oItem.getTitle();
				var sName = oItem.getDescription();

				// If item is selected
				if (oItem.getSelected()) {
					if (!aSelectedSupplierIDs.includes(sID)) {
						aSelectedSupplierIDs.push(sID);
						aSelectedSupplierNames.push(sName);
					}
				} else {
					// If item is unselected
					var index = aSelectedSupplierIDs.indexOf(sID);
					if (index !== -1) {
						aSelectedSupplierIDs.splice(index, 1);
						aSelectedSupplierNames.splice(index, 1);
					}
				}
			});

			oGlobalModel.setProperty("/selectedSupplierNames", aSelectedSupplierNames);
			oGlobalModel.setProperty("/selectedSupplierIDs", aSelectedSupplierIDs);
			oGlobalModel.setProperty("/selectedSupplierNamesDisplay", aSelectedSupplierNames.join(", "));
		},
		onConfirmSupplierMaster: function() {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");

			// Values are already being maintained correctly in the model
			var aSelectedNamesDisplay = oGlobalModel.getProperty("/selectedSupplierNamesDisplay") || "";
			var aSelectedNames = oGlobalModel.getProperty("/selectedSupplierNames") || [];
			var aSelectedIDs = oGlobalModel.getProperty("/selectedSupplierIDs") || [];

			// You can now directly use these for any processing or display
			console.log("Confirmed selected IDs:", aSelectedIDs);
			console.log("Confirmed selected Names:", aSelectedNames);
			console.log("Confirmed selected Display Names:", aSelectedNamesDisplay);

			oGlobalModel.refresh(true);

			this._resetSupplierMasterDialog();
			this._oSupplierMasterDialog.close();
		},
		onCloseSupplierMaster: function() {
			// Clear global model selections
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			oGlobalModel.setProperty("/selectedSupplierIDs", []);
			oGlobalModel.setProperty("/selectedSupplierNames", []);
			oGlobalModel.setProperty("/selectedSupplierNamesDisplay", "");

			this._resetSupplierMasterDialog();
			this._oSupplierMasterDialog.close();
		},
		_resetSupplierMasterDialog: function() {
			var oList = Fragment.byId(this.getView().getId(), "idSupplierMasterList");
			var oSearchField = Fragment.byId(this.getView().getId(), "idSupplierSearchField");

			// Clear Search
			if (oSearchField) {
				oSearchField.setValue("");

				// Manually trigger the liveChange event handler with empty value
				this.onSearchSupplierMaster({
					getParameter: function() {
						return "";
					}
				});
			}

			// Clear selections
			if (oList) {
				oList.getItems().forEach(function(oItem) {
					oItem.setSelected(false);
				});
			}
		},
		_handleFiscalYearClose: function(oEvent) {
			var aSelectedItems = oEvent.getParameter("selectedItems"); // Get selected items (multiSelect enabled)
			var aSelectedYears = [];

			if (aSelectedItems && aSelectedItems.length > 0) {
				aSelectedItems.forEach(function(oItem) {
					aSelectedYears.push(oItem.getTitle()); // Collect selected years
				});

				var oFiscalYearInput = this.byId(this._fiscalYearInputId); // Ensure input ID is correct
				if (oFiscalYearInput) {
					oFiscalYearInput.setValue(aSelectedYears.join(", ")); // Display selected values in input
				}

				// Store selected fiscal years in the global model
				var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
				if (oGlobalDataModel) {
					oGlobalDataModel.setProperty("/fiscalYears", aSelectedYears);
				}
			}

			// Reset visibility
			oEvent.getSource().getItems().forEach(function(oItem) {
				oItem.setVisible(true);
			});
		},
		_handleValueQuarterClose: function(oEvent) {
			var aSelectedItems = oEvent.getParameter("selectedItems"); // Get selected items for multiSelect
			var aSelectedQuarters = [];

			if (aSelectedItems && aSelectedItems.length > 0) {
				aSelectedItems.forEach(function(oItem) {
					aSelectedQuarters.push(oItem.getTitle()); // Collect selected quarters
				});

				var oQuarterInput = this.byId(this._quarterInputId); // Ensure input ID is correct
				if (oQuarterInput) {
					oQuarterInput.setValue(aSelectedQuarters.join(", ")); // Display selected values
				}

				// Store selected quarters in the global model
				var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
				if (oGlobalDataModel) {
					oGlobalDataModel.setProperty("/selectedQuarters", aSelectedQuarters);
				}
			}

			// Reset visibility
			oEvent.getSource().getItems().forEach(function(oItem) {
				oItem.setVisible(true);
			});
		},
		_handleQuarterYearClose: function(oEvent) {
			var aSelectedItems = oEvent.getParameter("selectedItems"); // Get selected items for multiSelect
			var aSelectedYears = [];

			if (aSelectedItems && aSelectedItems.length > 0) {
				aSelectedItems.forEach(function(oItem) {
					aSelectedYears.push(oItem.getTitle()); // Collect selected years
				});

				var oQuarterYearInput = this.byId(this._quarterInputYearId); // Ensure input ID is correct
				if (oQuarterYearInput) {
					oQuarterYearInput.setValue(aSelectedYears.join(", ")); // Display selected values
				}

				// Store selected quarter years in the global model
				var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
				if (oGlobalDataModel) {
					oGlobalDataModel.setProperty("/selectedQuarterYears", aSelectedYears);
				}
			}

			// Reset visibility
			oEvent.getSource().getItems().forEach(function(oItem) {
				oItem.setVisible(true);
			});
		},

		/*************** Clear the input value in livechange event  *****************/

		onSupplierInputLiveChange: function(oEvent) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var sValue = oEvent.getParameter("value");
			if (!sValue) {
				oGlobalModel.setProperty("/selectedSupplierNames", []);
				oGlobalModel.setProperty("/selectedSupplierIDs", []);
				oGlobalModel.setProperty("/selectedSupplierNamesDisplay", "");
			}
		},
		onFiscalYearInputLiveChange: function(oEvent) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var sValue = oEvent.getParameter("value");
			if (!sValue) {
				oGlobalModel.setProperty("/fiscalYears", "");
			}
		},
		onQuarterInputLiveChange: function(oEvent) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var sValue = oEvent.getParameter("value");
			if (!sValue) {
				oGlobalModel.setProperty("/selectedQuarters", "");
			}
		},
		onQuarterYearInputLiveChange: function(oEvent) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var sValue = oEvent.getParameter("value");
			if (!sValue) {
				oGlobalModel.setProperty("/selectedQuarterYears", "");
			}
		},

		/*************** radio Button & drop down selection  *****************/

		onRadioButtonSelectList: function(oEvent) {
			var sSelectedKey = oEvent.getSource().getSelectedIndex();

			// Get the containers (HBox elements)
			var oFiscalYearBox = this.getView().byId("fiscalYearBox");
			var oQuarterBox = this.getView().byId("quarterBox");
			var oQuarterYearBox = this.getView().byId("quarterYearBox");
			var oButtonBox = this.getView().byId("buttonBox");

			if (sSelectedKey === 0) { // Fiscal Year Wise selected
				oFiscalYearBox.setVisible(true);
				oQuarterBox.setVisible(false);
				oQuarterYearBox.setVisible(false);
				oButtonBox.setVisible(true);
			} else if (sSelectedKey === 1) { // Quarterly Wise selected
				oFiscalYearBox.setVisible(false);
				oQuarterBox.setVisible(true);
				oQuarterYearBox.setVisible(true);
				oButtonBox.setVisible(true);
			}
		},
		/*onChartTypeChange: function(oEvent) {
			// Get the selected radio button
			var chartType = oEvent.getSource().getSelectedKey();
			var oVizFrame = sap.ui.core.Fragment.byId(this.createId("chartFragment3"), "idVizFrame");

			oVizFrame.setVizType(chartType);

		},*/

		/*************** get the Icontabfilter select updated in global model  *****************/

		onTabSelect: function(oEvent) {
			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			var oCustomerMasterBox = this.getView().byId("customerMasterBox");

			// Get the selected tab key
			var sSelectedKey = oEvent.getParameter("selectedKey");

			// Define the mapping of keys to text values
			var oTextMapping = {
				"scenario1": "All Supplier Turnover",
				"scenario2": "Top 5 Supplier Turnover",
				"scenario3": "Single Supplier Turnover",
				"scenario4": "Purchase Turnover"
			};

			// visible non-visible on customer box
			if (oTextMapping[sSelectedKey] === "Single Supplier Turnover") {
				oCustomerMasterBox.setVisible(true);
			} else {
				oCustomerMasterBox.setVisible(false);
			}

			// Update the global model with the corresponding text
			if (oGlobalDataModel) {
				oGlobalDataModel.setProperty("/selectedTabText", oTextMapping[sSelectedKey] || "");
			}
		},

		/*************** get the table data from oData service  *****************/

		hasData: function(value) {
			if (Array.isArray(value)) {
				return value.length > 0; // Check if array is not empty
			} else if (typeof value === "string") {
				return value.trim() !== ""; // Check if string is not empty
			} else if (typeof value === "number") {
				return true; // Numbers are always valid
			}
			return false; // Return false for null, undefined, or empty values
		},
		getBackendData: function() {

			if (!this.validateInputs()) {
				/*sap.m.MessageBox.error("Please fill all required fields.");*/
				return;
			}

			var oGlobalData = this.getOwnerComponent().getModel("globalData").getData();
			var oSelectedTabText = oGlobalData.selectedTabText;

			if (oSelectedTabText === "All Supplier Turnover") {
				this.getAllCustomerData();

			} else if (oSelectedTabText === "Top 5 Supplier Turnover") {
				this.getTop5CustomerData();

			} else if (oSelectedTabText === "Single Supplier Turnover") {
				this.getSingleCustomerData();

			} else {
				this.getQuarterlyData();

			}

		},
		_buildFilters: function(oGlobalData, oSelectedIndex) {
			var filters = [];

			var oSelectedTabText = oGlobalData.selectedTabText;
			var aFiscalYears = oGlobalData.fiscalYears || [];
			var aSelectedSupplierMasterData = oGlobalData.selectedSupplierIDs || [];
			var aQuarters = oGlobalData.selectedQuarters || [];
			var aQuarterYears = oGlobalData.selectedQuarterYears || [];

			if (oSelectedIndex === 0) {
				if (aFiscalYears.length > 0) {
					filters.push(new Filter({
						filters: aFiscalYears.map(function(year) {
							return new Filter("fiscalYear", FilterOperator.EQ, year);
						}),
						and: false
					}));
				}
			} else {
				var quarterFilters = aQuarters.map(function(quarter) {
					return new Filter("fiscalQuater", FilterOperator.EQ, quarter); // double-check spelling
				});
				var quarterYearFilters = aQuarterYears.map(function(year) {
					return new Filter("quater_Year", FilterOperator.EQ, year); // double-check spelling
				});
				if (quarterFilters.length && quarterYearFilters.length) {
					filters.push(new Filter({
						filters: [
							new Filter({
								filters: quarterFilters,
								and: false
							}),
							new Filter({
								filters: quarterYearFilters,
								and: false
							})
						],
						and: true
					}));
				}
			}

			// Add supplier filter (for both tabs)
			if (oSelectedTabText === "Single Supplier Turnover" && aSelectedSupplierMasterData.length > 0) {
				filters.push(new Filter({
					filters: aSelectedSupplierMasterData.map(function(cust) {
						return new Filter("supplier", FilterOperator.EQ, cust);
					}),
					and: false
				}));
			}

			return filters;
		},
		getAllCustomerData: function() {
			var that = this;

			// Retrieve models once to avoid redundant calls
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var oGlobalDataModel = oComponent.getModel("globalData");
			var oGlobalData = oGlobalDataModel.getData();
			var oAllCustListDataModel = oComponent.getModel("allCustlistData");
			var oSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();

			// reusable filter function 
			var filters = this._buildFilters(oGlobalData, oSelectedIndex);

			// Show busy indicator
			sap.ui.core.BusyIndicator.show();

			// OData call to fetch data
			oModel.read("/SUPPSet", {
				urlParameters: {
					"sap-client": "300"
				},
				filters: filters,
				success: function(response) {
					var oData = response.results || [];
					console.log("Raw Response Data:", oData);

					// format customer data function
					that.formatCustomerData(oData);

					// Update models based on selection
					var isSelectedIndex = oSelectedIndex === 0;
					var sPropertyPath = isSelectedIndex ? "/allCustlistDataFiscalYearWise" : "/allCustlistDataQuaterlyWise";
					var sFragmentId = isSelectedIndex ? "chartFragment1" : "chartFragment2";

					oAllCustListDataModel.setProperty(sPropertyPath, oData);

					// Toggle visibility of chart fragments
					oGlobalDataModel.setProperty("/isChartFragment1Visible", isSelectedIndex);
					oGlobalDataModel.setProperty("/isChartFragment2Visible", !isSelectedIndex);

					// Bind chart
					isSelectedIndex ? that.bindChartColorRulesByFiscalYearWise(sFragmentId, oData) : that.bindChartColorRulesByQuarterlyWise(
						sFragmentId, oData);

					// Check if data is available
					sap.ui.core.BusyIndicator.hide();
					if (!oData.length) {
						sap.m.MessageBox.information("There are no data available!");
					}
				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.error(error);

					try {
						var errorObject = JSON.parse(error.responseText);
						sap.m.MessageBox.error(errorObject.error.message.value);
					} catch (e) {
						sap.m.MessageBox.error("An unexpected error occurred.");
					}
				}
			});
		},
		getTop5CustomerData: function() {
			var that = this;

			// Retrieve models once to avoid redundant calls
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var oGlobalDataModel = oComponent.getModel("globalData");
			var oGlobalData = oGlobalDataModel.getData();
			var oTop5CustListDataModel = oComponent.getModel("top5listData");
			var oSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();

			// reusable filter function 
			var filters = this._buildFilters(oGlobalData, oSelectedIndex);

			// Show busy indicator
			sap.ui.core.BusyIndicator.show();

			// OData call to fetch data
			oModel.read("/Supp_Top5Set", {
				urlParameters: {
					"sap-client": "300"
				},
				filters: filters,
				success: function(response) {
					var oData = response.results || [];
					console.log(oData);

					// format customer data function
					that.formatCustomerData(oData);

					// Update models based on selection
					var isSelectedIndex = oSelectedIndex === 0;
					var sPropertyPath = isSelectedIndex ? "/top5CustlistDataFiscalYearWise" : "/top5CustlistDataQuaterlyWise";
					var sFragmentId = isSelectedIndex ? "chartFragment3" : "chartFragment4";

					oTop5CustListDataModel.setProperty(sPropertyPath, oData);

					// Toggle visibility of chart fragments
					oGlobalDataModel.setProperty("/isChartFragment3Visible", isSelectedIndex);
					oGlobalDataModel.setProperty("/isChartFragment4Visible", !isSelectedIndex);

					// Bind chart
					isSelectedIndex ? that.bindChartColorRulesByFiscalYearWise(sFragmentId, oData) : that.bindChartColorRulesByQuarterlyWise(
						sFragmentId, oData);

					// Check if data is available
					sap.ui.core.BusyIndicator.hide();
					if (!oData.length) {
						sap.m.MessageBox.information("There are no data available!");
					}
				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.error(error);

					try {
						var errorObject = JSON.parse(error.responseText);
						sap.m.MessageBox.error(errorObject.error.message.value);
					} catch (e) {
						sap.m.MessageBox.error("An unexpected error occurred.");
					}
				}
			});
		},
		getSingleCustomerData: function() {
			var that = this;

			// Retrieve models once to avoid redundant calls
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var oGlobalDataModel = oComponent.getModel("globalData");
			var oGlobalData = oGlobalDataModel.getData();
			var oSingleCustListDataModel = oComponent.getModel("singleCustlistData");
			var oSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();

			// reusable filter function 
			var filters = this._buildFilters(oGlobalData, oSelectedIndex);

			// Show busy indicator
			sap.ui.core.BusyIndicator.show();

			// OData call to fetch data
			oModel.read("/SINGLE_SUPPSet", {
				urlParameters: {
					"sap-client": "300"
				},
				filters: filters,
				success: function(response) {
					var oData = response.results || [];
					console.log(oData);

					// format customer data function
					that.formatCustomerData(oData);

					// Update models based on selection
					var isSelectedIndex = oSelectedIndex === 0;
					var sPropertyPath = isSelectedIndex ? "/singleCustlistDataFiscalYearWise" : "/singleCustlistDataQuaterlyWise";
					var sFragmentId = isSelectedIndex ? "chartFragment5" : "chartFragment6";

					oSingleCustListDataModel.setProperty(sPropertyPath, oData);

					// Toggle visibility of chart fragments
					oGlobalDataModel.setProperty("/isChartFragment5Visible", isSelectedIndex);
					oGlobalDataModel.setProperty("/isChartFragment6Visible", !isSelectedIndex);

					// Bind chart
					isSelectedIndex ? that.bindChartColorRulesByFiscalYearWise(sFragmentId, oData) : that.bindChartColorRulesByQuarterlyWise(
						sFragmentId, oData);

					// Check if data is available
					sap.ui.core.BusyIndicator.hide();
					if (!oData.length) {
						sap.m.MessageBox.information("There are no data available!");
					}
				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.error(error);

					try {
						var errorObject = JSON.parse(error.responseText);
						sap.m.MessageBox.error(errorObject.error.message.value);
					} catch (e) {
						sap.m.MessageBox.error("An unexpected error occurred.");
					}
				}
			});
		},
		getQuarterlyData: function() {
			var that = this;

			// Retrieve models once to avoid redundant calls
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var oGlobalDataModel = oComponent.getModel("globalData");
			var oGlobalData = oGlobalDataModel.getData();
			var oQuarterlyTurnoverlistDataModel = oComponent.getModel("quarterlyTurnoverlistData");
			var oSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();

			// reusable filter function 
			var filters = this._buildFilters(oGlobalData, oSelectedIndex);

			// Show busy indicator
			sap.ui.core.BusyIndicator.show();

			// OData call to fetch data
			oModel.read("/POSet", {
				urlParameters: {
					"sap-client": "300"
				},
				filters: filters,
				success: function(response) {
					var oData = response.results || [];
					console.log(oData);

					// format customer data function
					that.formatCustomerData(oData);

					// Update models based on selection
					var isSelectedIndex = oSelectedIndex === 0;
					var sPropertyPath = isSelectedIndex ? "/quarterlyTurnoverlistDataFiscalYearWise" :
						"/quarterlyTurnoverlistDataQuaterlyWise";
					var sFragmentId = isSelectedIndex ? "chartFragment7" : "chartFragment8";

					oQuarterlyTurnoverlistDataModel.setProperty(sPropertyPath, oData);

					// Toggle visibility of chart fragments
					oGlobalDataModel.setProperty("/isChartFragment7Visible", isSelectedIndex);
					oGlobalDataModel.setProperty("/isChartFragment8Visible", !isSelectedIndex);

					// Bind chart
					isSelectedIndex ? that.bindChartColorRulesByFiscalYearWise(sFragmentId, oData) : that.bindChartColorRulesByQuarterlyWise(
						sFragmentId, oData);

					// Check if data is available
					sap.ui.core.BusyIndicator.hide();
					if (!oData.length) {
						sap.m.MessageBox.information("There are no data available!");
					}
				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.error(error);

					try {
						var errorObject = JSON.parse(error.responseText);
						sap.m.MessageBox.error(errorObject.error.message.value);
					} catch (e) {
						sap.m.MessageBox.error("An unexpected error occurred.");
					}
				}
			});
		},
		formatCustomerData: function(oData) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var oSelectedTabText = oGlobalModel.getProperty("/selectedTabText");
			oData.forEach(item => {
				this.convertTurnoverToCrore(item);
				if (oSelectedTabText !== "Purchase Turnover") {
					this.generateSupplierShort(item);
				}

			});
			return oData;
		},
		convertTurnoverToCrore: function(item) {
			if (item.turnOver) {
				item.turnOver = (parseFloat(item.turnOver) / 10000000).toFixed(2);
			}
		},
		generateSupplierShort: function(item) {
			const words = item.supplier.split(" ");
			const abbreviation = words
				.filter(w => w.length > 2 && w[0] === w[0].toUpperCase())
				.map(w => w[0])
				.join("")
				.toUpperCase();

			item.supplierShort = abbreviation || item.supplier;
		},

		/*************** Clear data from all input fields,radio button & model make it default  *****************/

		clearListData: function() {
			const that = this;
			const oView = that.getView();

			sap.m.MessageBox.confirm("Are you sure you want to clear all data?", {
				onClose: function(oAction) {
					var oGlobalDataModel = that.getOwnerComponent().getModel("globalData");
					if (oAction === sap.m.MessageBox.Action.OK) {

						// Clear input fields
						const aInputIds = [
							"_supplierInputId",
							"_financialYearInputId",
							"_quarterInputId",
							"_quarterInputYearId"
						];
						aInputIds.forEach((sId) => {
							const oInput = that.byId(sId);
							if (oInput) oInput.setValue("");
						});

						// Clear the values bound to the input fields
						oGlobalDataModel.setProperty("/selectedSupplierNamesDisplay", "");
						oGlobalDataModel.setProperty("/selectedSupplierNames", "");
						oGlobalDataModel.setProperty("/selectedSupplierIDs", "");
						oGlobalDataModel.setProperty("/fiscalYears", "");
						oGlobalDataModel.setProperty("/selectedQuarters", "");
						oGlobalDataModel.setProperty("/selectedQuarterYears", "");

						// Reset RadioButtonGroup to default
						const oRadioGroup = that.byId("radioBtnlist");
						if (oRadioGroup) {
							oRadioGroup.setSelectedIndex(0); // 0 = Fiscal Year Wise
							that.onRadioButtonSelectList({
								getSource: () => oRadioGroup
							});
						}

						// Reset IconTabBar to default tab
						const oIconTabBar = oView.byId("iconTabBar");
						if (oIconTabBar) {
							oIconTabBar.setSelectedKey("scenario1");
							that.onTabSelect({
								getParameter: () => "scenario1"
							});
						}

						// Reset global data
						that._updateGlobalDataModel();

						// Define model reset map
						const oModelResetMap = {
							allCustlistData: [
								"/allCustlistDataFiscalYearWise",
								"/allCustlistDataQuaterlyWise"
							],
							top10listData: [
								"/top5CustlistDataFiscalYearWise",
								"/top5CustlistDataQuaterlyWise"
							],
							singleCustlistData: [
								"/singleCustlistDataFiscalYearWise",
								"/singleCustlistDataQuaterlyWise"
							],
							quarterlyTurnoverlistData: [
								"/quarterlyTurnoverlistDataFiscalYearWise",
								"/quarterlyTurnoverlistDataQuaterlyWise"
							]
						};

						// Reset data in each model
						Object.keys(oModelResetMap).forEach((sModelName) => {
							const oModel = that.getOwnerComponent().getModel(sModelName);
							if (oModel) {
								oModelResetMap[sModelName].forEach((sPath) => {
									oModel.setProperty(sPath, []);
								});
							}
						});
					}
				}
			});
		},

		/*************** chart function & plotting the chart data  *****************/

		generateColorMapByFiscalYearWise: function(data, selectedTabText) {
			const colorMap = {};
			let uniqueKeys = [];

			// Choose key format based on selected tab
			if (selectedTabText === "Purchase Turnover") {
				uniqueKeys = [...new Set(data.map(item => item.fiscalYear))];
			} else {
				uniqueKeys = [...new Set(data.map(item => `${item.supplierShort} (${item.fiscalYear})`))];
			}

			// Generate HSL colors based on index
			uniqueKeys.forEach((key, i) => {
				const color = `hsl(${(i * 43) % 360}, 70%, 50%)`;
				colorMap[key] = color;
			});

			return {
				colorMap
			};
		},
		bindChartColorRulesByFiscalYearWise: function(sFragmentId, oData) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var oSelectedTabText = oGlobalModel.getProperty("/selectedTabText");
			var oVizFrame = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idVizFrame");

			if (!oVizFrame) {
				console.warn("VizFrame not found for Fragment ID:", sFragmentId);
				return;
			}

			var {
				colorMap
			} = this.generateColorMapByFiscalYearWise(oData, oSelectedTabText);

			var rules = [];

			if (oSelectedTabText === "Purchase Turnover") {
				rules = oData.map(item => ({
					dataContext: {
						"Fiscal Year": item.fiscalYear
					},
					properties: {
						color: colorMap[item.fiscalYear]
					}
				}));
			} else {
				rules = oData.map(item => {
					const key = `${item.supplierShort} (${item.fiscalYear})`;
					return {
						dataContext: {
							"Supplier Name": item.supplierShort,
							"Fiscal Year": item.fiscalYear
						},
						properties: {
							color: colorMap[key]
						}
					};
				});
			}

			oVizFrame.setVizProperties({
				title: {
					visible: true,
					text: "Fiscal Year Wise Turnover"
				},
				plotArea: {
					dataPointStyle: {
						rules
					},
					dataLabel: {
						visible: true,
					},
					drawingEffect: "glossy"
				},
				interaction: {
					selectability: {
						mode: "multiple"
					}
				}
			});

		},
		generateColorMapByQuarterlyWise: function(data, selectedTabText) {
			var colorMap = {};
			var uniqueKeys = [];

			if (selectedTabText === "Purchase Turnover") {
				uniqueKeys = [...new Set(data.map(item => `(${item.quater} ${item.quaterYear})`))];
			} else {
				uniqueKeys = [...new Set(data.map(item => `${item.supplierShort} (${item.quater} ${item.quaterYear})`))];
			}

			uniqueKeys.forEach(function(key, i) {
				var color = `hsl(${(i * 37) % 360}, 65%, 55%)`;
				colorMap[key] = color;
			});

			return {
				colorMap: colorMap
			};
		},
		bindChartColorRulesByQuarterlyWise: function(sFragmentId, oData) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var oSelectedTabText = oGlobalModel.getProperty("/selectedTabText");
			var oVizFrame = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idVizFrame");

			if (!oVizFrame) {
				console.warn("VizFrame not found for Fragment ID:", sFragmentId);
				return;
			}

			var result = this.generateColorMapByQuarterlyWise(oData, oSelectedTabText);
			var colorMap = result.colorMap;
			var rules = [];

			if (oSelectedTabText === "Purchase Turnover") {
				rules = oData.map(function(item) {
					var key = `(${item.quater} ${item.quaterYear})`;
					return {
						dataContext: {
							"Quarter": item.quater,
							"Quarter Year": item.quaterYear
						},
						properties: {
							color: colorMap[key]
						}
					};
				});
			} else {
				rules = oData.map(function(item) {
					var key = `${item.supplierShort} (${item.quater} ${item.quaterYear})`;
					return {
						dataContext: {
							"Supplier Name": item.supplierShort,
							"Quarter": item.quater,
							"Quarter Year": item.quaterYear
						},
						properties: {
							color: colorMap[key]
						}
					};
				});
			}

			oVizFrame.setVizProperties({
				title: {
					visible: true,
					text: "Quaterly Wise Turnover"
				},
				plotArea: {
					dataPointStyle: {
						rules: rules
					},
					dataLabel: {
						visible: true
					},
					drawingEffect: "glossy"
				},
				tooltip: {
					visible: true
				},
				interaction: {
					selectability: {
						mode: "multiple"
					}
				}
			});
		}

	});
});