/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @description Custom module with utility functions for LLM operations
 */
define(["N/search", "N/record", "N/format"]
/**
 * @param {import('N/search')} search
 * @param {import('N/record')} record
 * @param {import('N/format')} format
 */, function (search, record, format) {
  /**
   * Tool Definitions for LLM
   * These definitions describe the available tools and their parameters
   */
  const TOOL_DEFINITIONS = {
    searchTransactions: {
      name: "searchTransactions",
      description:
        "Search for transactions in NetSuite based on various criteria. Can search by date range, type, amount range, and other parameters.",
      args: {
        type: "object",
        properties: {
          dateFrom: {
            type: "string",
            description: "Start date in format YYYY-MM-DD",
            optional: true,
          },
          dateTo: {
            type: "string",
            description: "End date in format YYYY-MM-DD",
            optional: true,
          },
          type: {
            type: "string",
            description:
              "Transaction type (e.g., 'invoice', 'salesorder', 'purchaseorder')",
            optional: true,
          },
          amountMin: {
            type: "number",
            description: "Minimum transaction amount",
            optional: true,
          },
          amountMax: {
            type: "number",
            description: "Maximum transaction amount",
            optional: true,
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return",
            optional: true,
            default: 10,
          },
        },
      },
    },

    analyzeCustomer: {
      name: "analyzeCustomer",
      description:
        "Analyze a customer's profile including transaction history, outstanding balance, and key metrics.",
      args: {
        type: "object",
        properties: {
          customerId: {
            type: "string",
            description: "Internal ID of the customer to analyze",
            required: true,
          },
          includeTransactions: {
            type: "boolean",
            description: "Whether to include transaction history",
            optional: true,
            default: true,
          },
          dateRange: {
            type: "number",
            description: "Number of days of history to analyze",
            optional: true,
            default: 365,
          },
        },
      },
    },

    generateReport: {
      name: "generateReport",
      description:
        "Generate a customized report based on specified metrics and parameters.",
      args: {
        type: "object",
        properties: {
          reportType: {
            type: "string",
            description:
              "Type of report (e.g., 'sales', 'inventory', 'financial')",
            required: true,
          },
          metrics: {
            type: "array",
            description: "Array of metrics to include in the report",
            items: {
              type: "string",
            },
            required: true,
          },
          groupBy: {
            type: "string",
            description:
              "How to group the data (e.g., 'customer', 'item', 'location')",
            optional: true,
          },
          format: {
            type: "string",
            description: "Output format ('json', 'csv', 'summary')",
            optional: true,
            default: "json",
          },
        },
      },
    },

    analyzeItem: {
      name: "analyzeItem",
      description:
        "Analyze an inventory item's performance, including sales history, stock levels, and reordering metrics.",
      args: {
        type: "object",
        properties: {
          itemId: {
            type: "string",
            description: "Internal ID of the item to analyze",
            required: true,
          },
          locationId: {
            type: "string",
            description: "Location ID to analyze inventory for",
            optional: true,
          },
          period: {
            type: "string",
            description:
              "Analysis period ('last30days', 'last90days', 'last12months')",
            optional: true,
            default: "last90days",
          },
        },
      },
    },

    executeSavedSearch: {
      name: "executeSavedSearch",
      description:
        "Execute a saved search by ID and return the results with optional filtering.",
      args: {
        type: "object",
        properties: {
          searchId: {
            type: "string",
            description: "Internal ID of the saved search to execute",
            required: true,
          },
          filters: {
            type: "array",
            description: "Additional filters to apply",
            optional: true,
            items: {
              type: "object",
              properties: {
                fieldId: { type: "string" },
                operator: { type: "string" },
                value: { type: "string" },
              },
            },
          },
          maxResults: {
            type: "number",
            description: "Maximum number of results to return",
            optional: true,
            default: 100,
          },
        },
      },
    },

    employeePerformance: {
      name: "employeePerformance",
      description:
        "Analyze employee performance metrics including sales, task completion, and customer satisfaction.",
      args: {
        type: "object",
        properties: {
          employeeId: {
            type: "string",
            description: "Internal ID of the employee",
            required: true,
          },
          metrics: {
            type: "array",
            description: "Metrics to analyze ('sales', 'tasks', 'cases', 'satisfaction')",
            optional: true,
            default: ["sales", "tasks"],
          },
          dateRange: {
            type: "string",
            description: "Period to analyze ('thisMonth', 'lastMonth', 'thisQuarter', 'thisYear')",
            optional: true,
            default: "thisMonth",
          },
        },
      },
    },
  };

  /**
   * Implementation of searchTransactions tool
   */
  function searchTransactions(params) {
    const filters = [];
    const columns = [];

    // Add date filters
    if (params.dateFrom) {
      filters.push(
        search.createFilter({
          name: "trandate",
          operator: search.Operator.ONORAFTER,
          values: params.dateFrom,
        })
      );
    }
    if (params.dateTo) {
      filters.push(
        search.createFilter({
          name: "trandate",
          operator: search.Operator.ONORBEFORE,
          values: params.dateTo,
        })
      );
    }

    // Add transaction type filter
    if (params.type) {
      filters.push(
        search.createFilter({
          name: "type",
          operator: search.Operator.ANYOF,
          values: params.type,
        })
      );
    }

    // Add amount filters
    if (params.amountMin !== undefined) {
      filters.push(
        search.createFilter({
          name: "amount",
          operator: search.Operator.GREATERTHANOREQUALTO,
          values: params.amountMin,
        })
      );
    }
    if (params.amountMax !== undefined) {
      filters.push(
        search.createFilter({
          name: "amount",
          operator: search.Operator.LESSTHANOREQUALTO,
          values: params.amountMax,
        })
      );
    }

    // Add columns
    columns.push(
      search.createColumn({ name: "trandate" }),
      search.createColumn({ name: "type" }),
      search.createColumn({ name: "tranid" }),
      search.createColumn({ name: "entity" }),
      search.createColumn({ name: "amount" })
    );

    const searchObj = search.create({
      type: search.Type.TRANSACTION,
      filters: filters,
      columns: columns,
    });

    const limit = params.limit || 10;
    const results = [];

    searchObj.run().each(function (result) {
      results.push({
        date: format.format({
          value: result.getValue("trandate"),
          type: format.Type.DATE,
        }),
        type: result.getValue("type"),
        documentNumber: result.getValue("tranid"),
        entity: result.getText("entity"),
        amount: parseFloat(result.getValue("amount")),
      });
      return results.length < limit;
    });

    return {
      success: true,
      count: results.length,
      results: results,
    };
  }

  /**
   * Implementation of analyzeCustomer tool
   */
  function analyzeCustomer(params) {
    const customer = record.load({
      type: record.Type.CUSTOMER,
      id: params.customerId,
    });

    const analysis = {
      basic: {
        id: customer.id,
        name: customer.getValue("companyname") || customer.getValue("entityid"),
        dateCreated: format.format({
          value: customer.getValue("datecreated"),
          type: format.Type.DATE,
        }),
        status: customer.getValue("entitystatus"),
        creditLimit: customer.getValue("creditlimit"),
        balance: customer.getValue("balance"),
        overdue: customer.getValue("overduebalance"),
      },
    };

    if (params.includeTransactions) {
      const transactions = searchTransactions({
        dateFrom: format.format({
          value: new Date(
            Date.now() - (params.dateRange || 365) * 24 * 60 * 60 * 1000
          ),
          type: format.Type.DATE,
        }),
        type: ["invoice", "salesorder", "payment"],
        limit: 100,
      });
      analysis.transactions = transactions.results;

      // Calculate metrics
      const metrics = {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
      };

      transactions.results.forEach((tran) => {
        if (tran.type === "invoice" || tran.type === "salesorder") {
          metrics.totalOrders++;
          metrics.totalSpent += tran.amount;
        }
      });
      metrics.averageOrderValue = metrics.totalOrders
        ? metrics.totalSpent / metrics.totalOrders
        : 0;
      analysis.metrics = metrics;
    }

    return {
      success: true,
      analysis: analysis,
    };
  }

  /**
   * Implementation of generateReport tool
   */
  function generateReport(params) {
    const metrics = params.metrics;
    const reportType = params.reportType.toLowerCase();
    const format = params.format || "json";

    // Build search based on report type
    const searchConfig = {
      filters: [],
      columns: [],
    };

    switch (reportType) {
      case "sales":
        searchConfig.type = search.Type.TRANSACTION;
        searchConfig.filters.push(
          search.createFilter({
            name: "type",
            operator: search.Operator.ANYOF,
            values: ["SalesOrd", "Invoice"],
          })
        );
        break;

      case "inventory":
        searchConfig.type = search.Type.ITEM;
        searchConfig.filters.push(
          search.createFilter({
            name: "type",
            operator: search.Operator.NONEOF,
            values: ["Description", "Discount"],
          })
        );
        break;

      case "financial":
        searchConfig.type = search.Type.TRANSACTION;
        searchConfig.filters.push(
          search.createFilter({
            name: "posting",
            operator: search.Operator.IS,
            values: true,
          })
        );
        break;

      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    // Add columns based on metrics
    metrics.forEach((metric) => {
      searchConfig.columns.push(
        search.createColumn({
          name: metric,
          summary: params.groupBy ? search.Summary.GROUP : search.Summary.COUNT,
        })
      );
    });

    // Add grouping if specified
    if (params.groupBy) {
      searchConfig.columns.push(
        search.createColumn({
          name: params.groupBy,
          summary: search.Summary.GROUP,
        })
      );
    }

    const searchObj = search.create(searchConfig);
    const results = [];

    searchObj.run().each(function (result) {
      const row = {};
      searchConfig.columns.forEach((column) => {
        row[column.name] = result.getValue(column);
      });
      results.push(row);
      return true;
    });

    // Format results based on specified format
    let formattedResults;
    switch (format) {
      case "json":
        formattedResults = results;
        break;

      case "csv":
        const headers = Object.keys(results[0] || {}).join(",");
        const rows = results
          .map((row) => Object.values(row).join(","))
          .join("\\n");
        formattedResults = headers + "\\n" + rows;
        break;

      case "summary":
        formattedResults = {
          totalCount: results.length,
          summary: results.reduce((acc, row) => {
            metrics.forEach((metric) => {
              acc[metric] = (acc[metric] || 0) + (parseFloat(row[metric]) || 0);
            });
            return acc;
          }, {}),
        };
        break;
    }

    return {
      success: true,
      reportType: reportType,
      format: format,
      results: formattedResults,
    };
  }

  /**
   * Implementation of analyzeItem tool
   * Returns dummy data for testing
   */
  function analyzeItem(params) {
    // Dummy data for testing
    const dummyData = {
      itemDetails: {
        id: params.itemId,
        name: "Sample Item " + params.itemId,
        type: "Inventory Item",
        basePrice: 99.99,
        stockUnit: "Each"
      },
      inventory: {
        onHand: 156,
        committed: 45,
        available: 111,
        onOrder: 200,
        reorderPoint: 100,
        preferredStockLevel: 300
      },
      salesMetrics: {
        last30Days: {
          quantitySold: 127,
          revenue: 12687.73,
          averagePrice: 99.99,
          topLocations: [
            { name: "Main Warehouse", sales: 89 },
            { name: "East Coast Store", sales: 38 }
          ]
        },
        trends: {
          monthOverMonth: "+12%",
          yearOverYear: "+8%",
          seasonality: "High in Q4"
        }
      },
      recommendations: [
        {
          type: "REORDER",
          priority: "HIGH",
          message: "Stock levels approaching reorder point",
          suggestedAction: "Place purchase order for 200 units"
        },
        {
          type: "PRICING",
          priority: "MEDIUM",
          message: "Price elasticity analysis suggests opportunity",
          suggestedAction: "Consider 5% price increase"
        }
      ]
    };

    return {
      success: true,
      period: params.period || "last90days",
      location: params.locationId ? "Location " + params.locationId : "All Locations",
      analysis: dummyData
    };
  }

  /**
   * Implementation of executeSavedSearch tool
   * Returns dummy data for testing
   */
  function executeSavedSearch(params) {
    // Dummy data for testing
    const dummyResults = [];
    const resultCount = Math.min(params.maxResults || 100, 1000);
    
    for (let i = 0; i < resultCount; i++) {
      dummyResults.push({
        id: "RES_" + (i + 1),
        date: format.format({
          value: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          type: format.Type.DATE
        }),
        customer: "Customer " + (Math.floor(i / 3) + 1),
        amount: Math.round(Math.random() * 10000) / 100,
        status: ["Pending", "Completed", "Approved"][i % 3]
      });
    }

    return {
      success: true,
      searchId: params.searchId,
      totalResults: resultCount,
      appliedFilters: params.filters || [],
      results: dummyResults
    };
  }

  /**
   * Implementation of employeePerformance tool
   * Returns dummy data for testing
   */
  function employeePerformance(params) {
    // Dummy data for testing
    const dummyPerformance = {
      employeeInfo: {
        id: params.employeeId,
        name: "Employee " + params.employeeId,
        department: "Sales",
        supervisor: "Manager " + Math.floor(Math.random() * 100)
      },
      metrics: {
        sales: {
          total: Math.round(Math.random() * 1000000) / 100,
          transactions: Math.floor(Math.random() * 200),
          averageValue: Math.round(Math.random() * 10000) / 100,
          quota: {
            target: 100000,
            achieved: Math.round(Math.random() * 120000),
            performance: "108%"
          }
        },
        tasks: {
          total: Math.floor(Math.random() * 100),
          completed: Math.floor(Math.random() * 80),
          onTime: Math.floor(Math.random() * 70),
          overdue: Math.floor(Math.random() * 10)
        },
        cases: {
          handled: Math.floor(Math.random() * 50),
          resolved: Math.floor(Math.random() * 45),
          averageResolutionTime: Math.floor(Math.random() * 24) + "hours"
        },
        satisfaction: {
          overall: Math.round(Math.random() * 50 + 50) / 10,
          responses: Math.floor(Math.random() * 100),
          trends: ["Improving", "Stable", "Needs Attention"][Math.floor(Math.random() * 3)]
        }
      },
      rankings: {
        department: Math.floor(Math.random() * 10) + 1,
        company: Math.floor(Math.random() * 50) + 1
      },
      trends: {
        performance: ["↑", "↓", "→"][Math.floor(Math.random() * 3)],
        comparedToLastPeriod: Math.round(Math.random() * 40 - 20) + "%"
      }
    };

    return {
      success: true,
      dateRange: params.dateRange || "thisMonth",
      metrics: params.metrics || ["sales", "tasks"],
      performance: dummyPerformance
    };
  }

  return {
    searchTransactions,
    analyzeCustomer,
    generateReport,
    analyzeItem,
    executeSavedSearch,
    employeePerformance,
    TOOL_DEFINITIONS
  };
});
