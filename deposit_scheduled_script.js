/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/log', 'N/runtime'], function(record, search, log, runtime) {

    function execute(context) {
        var script = runtime.getCurrentScript();

        var bankAccountId = script.getParameter({ name: 'custscript_bank_acct_id' });
        var savedSearchId = script.getParameter({ name: 'custscript_transaction_search_id' });

        if (!bankAccountId || !savedSearchId) {
            log.error({ title: 'Missing Parameters', details: 'Both bank account ID and transaction search ID are required.' });
            return;
        }

        var transSearch;
        try {
            transSearch = search.load({ id: savedSearchId });
        } catch (e) {
            log.error({ title: 'Failed to Load Search', details: e });
            return;
        }

        var deposit = record.create({
            type: record.Type.DEPOSIT,
            isDynamic: true
        });

        deposit.setValue({
            fieldId: 'account',
            value: bankAccountId
        });

        transSearch.run().each(function(result) {
            var transId = result.getValue({ name: 'internalid' });

            deposit.selectNewLine({ sublistId: 'payment' });
            deposit.setCurrentSublistValue({
                sublistId: 'payment',
                fieldId: 'doc',
                value: transId
            });
            deposit.commitLine({ sublistId: 'payment' });

            log.debug({ title: 'Added Transaction', details: 'Transaction ID: ' + transId });
            return true;
        });

        var lineCount = deposit.getLineCount({ sublistId: 'payment' });
        if (lineCount === 0) {
            log.error({ title: 'No Transactions', details: 'Search returned no transactions to deposit.' });
            return;
        }

        var depositId = deposit.save();
        log.audit({ title: 'Deposit Created', details: 'Deposit ID: ' + depositId });
    }

    return { execute: execute };
});
