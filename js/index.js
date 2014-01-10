const DEVICE_TYPE = 'mobile';  // browser or mobile

var loader = null
var dbName = "list users";
var dbVersion = "1.0.0";
var dbDescription = "List users";
var dbAmount = 2 * 1024 * 1024;     // velkost v bajtoch
var db = null;  // web database
var dbi = new Object(); // indexed
var dbiName = "listUsers";

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        switch (DEVICE_TYPE) {
            case 'mobile':
                document.addEventListener('deviceready', this.onDeviceReady, false);
                break;
            case 'browser':
                this.onDeviceReady();
                break;
            default:
                this.onDeviceReady();
                break;
        }
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        onLoad();
    }
};
// on load
function onLoad() {
    // loader
    loader = $(".loader");
    // init database
    websqlInit();
    indexedInit();
    // slide formular
    $("span.toogleForm").click(function() {
        $("#databaseAPI").slideToggle("slow");
    });
    // submit form
    $("#databaseAPI").submit(function(event) {
        var data = new Object();

        data.id         = $("#id").val();
        data.name       = $("#name").val();
        data.surname    = $("#surname").val();
        data.email      = $("#email").val();
        data.websql     = $("#websql").is(":checked");
        data.indexed    = $("#indexed").is(":checked");

        //loader.show();

        if(data.websql) {
            if (data.id)
                websqlUpdateRow(data);
            else
                websqlSaveData(data);
        }

        if(data.indexed) {
            if (data.id)
                indexedUpdateRow(data);
            else
                indexedSaveData(data);
        }

        return false;
    });
}

function resetForm() {
    $("#id").val("");
    $("#name").val("");
    $("#surname").val("");
    $("#email").val("");
}

// The Web SQL Database
function websqlInit() {
    db = window.openDatabase(dbName, dbVersion, dbDescription, dbAmount);
    //if (db.version != '1.0.0') {
        db.transaction(function(tx) {
            console.log("SUCCESS: Init websql database.");
            tx.executeSql('CREATE TABLE IF NOT EXISTS users (id integer primary key autoincrement, name, surname, email)');
        });
    //}

    if (!db) {
        alert("Your browser doesn't support a stable version of Web SQL Database. Such and such feature will not be available.");
    }
    // list saved data
    websqlListData();
}

// list data
function websqlListData(options) {
    var table = $("#websqlList");
    var html = "";

    if (!options)
        options = "";

    db.transaction(function(tx) {
        tx.executeSql('SELECT id, name, surname, email FROM users' + options, [], function(tx, result) {
            var i = 0;

            if (result.rows.length) {
                for (i = 0; i < result.rows.length; i++) {
                    html += "<tr>";
                        html += "<td>" + result.rows.item(i).id + "</td>";
                        html += "<td>" + result.rows.item(i).name + "</td>";
                        html += "<td>" + result.rows.item(i).surname + "</td>";
                        html += "<td>" + result.rows.item(i).email + "</td>";
                        html += "<td>" +
                                    "<a href='JavaScript:void(0);' onclick='websqlRemoveRow(" + result.rows.item(i).id + ")' title='Zmazať'>Zmazať</a>&nbsp;/&nbsp;" +
                                    "<a href='JavaScript:void(0);' onclick='websqlLoadData(" + result.rows.item(i).id + ")' title='Upraviť'>Upraviť</a>" +
                                "</td>";
                    html += "</tr>";
                }

                table.children("tbody").html(html);
                table.show();
            }
            else {
                table.children("tbody").html("");
                table.hide();
            }

            loader.hide();
        });
    });
}

// save data
function websqlSaveData(data) {
    db.transaction(function(tx) {
        tx.executeSql('INSERT INTO users (name, surname, email) VALUES ("' + data.name  + '", "' + data.surname  + '", "' + data.email  + '")', [], function(tx, result) {
            websqlListData();
            resetForm();
            loader.hide();
        });
    });
}

// update data
function websqlUpdateRow(data) {
    db.transaction(function(tx) {
        tx.executeSql('UPDATE users SET name = "' + data.name + '", surname = "' + data.surname + '", email = "' + data.email + '" WHERE id = ' + data.id, [], function(tx, result) {
            console.log(result);
            websqlListData();
            resetForm();
            loader.hide();
        });
    });
}

// load data to form
function websqlLoadData(id) {
    db.transaction(function(tx) {
        tx.executeSql('SELECT id, name, surname, email FROM users WHERE id = ' + id, [], function(tx, result) {
            var row = result.rows.item(0);

            $("#id").val(row.id);
            $("#name").val(row.name);
            $("#surname").val(row.surname);
            $("#email").val(row.email);

            loader.hide();
        });
    });
}

// remove row
function websqlRemoveRow(id) {
    db.transaction(function(tx) {
        tx.executeSql('DELETE FROM users WHERE id = ' + id, [], function(tx, result) {
            console.log("SUCCESS: Remove web SQL database.");
            websqlListData();
            loader.hide();
        });
    });
}

// The Indexed Database API
function indexedInit() {
    dbi.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    dbi.transaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    dbi.keyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

    if (!dbi.indexedDB) {
        alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
    }
    else {
        var request = dbi.indexedDB.open(dbiName, 3);
        request.onupgradeneeded = function(event) {
            var db = event.target.result;
            var objectStore = db.createObjectStore(dbiName, {keyPath: "id", autoIncrement: true, unique: true});
            objectStore.createIndex("name", "name", { unique: false });
            objectStore.createIndex("surname", "surname", { unique: false });
            objectStore.createIndex("email", "email", { unique: false });
        };

        // handler error
        request.onerror = function(event) {
            //alert("ERROR: Init indexed database.");
            console.log("ERROR: Init indexed database.");
            console.log(event);
        };

        // handler success
        request.onsuccess = function(event) {
            //alert("SUCCESS: Init indexed database.");
            console.log("SUCCESS: Init indexed database.");
            dbi.request = request;
            // list saved data
            indexedListData();
        };
    }
}

// list data
function indexedListData(options) {
    var result = dbi.request.result;
    var transaction = dbi.request.result.transaction(dbiName, "readwrite").objectStore(dbiName).count();

    transaction.onerror = function(event) {
        //alert("ERROR: Count from indexed database.");
        console.log("ERROR: Count from indexed database.");
        console.log(event);
    }

    transaction.onsuccess = function(event) {
        var request = event.target.source.openCursor();;
        var table = $("#indexedList");
        var html = "";

        request.onsuccess = function(event) {
            var cursor = event.target.result;

            if (cursor) {
                request = event.target.source.get(cursor.key);

                request.onsuccess = function (event) {
                    var value = event.target.result;

                    html += "<tr>";
                        html += "<td>" + cursor.key + "</td>";
                        html += "<td>" + value.name + "</td>";
                        html += "<td>" + value.surname + "</td>";
                        html += "<td>" + value.email + "</td>";
                        html += "<td>" +
                                    "<a href='JavaScript:void(0);' onclick='indexedRemoveRow(" + cursor.key + ")' title='Zmazať'>Zmazať</a>&nbsp;<!--/&nbsp;-->" +
                                    "<!--<a href='JavaScript:void(0);' onclick='indexedLoadData(" + cursor.key + ")' title='Upraviť'>Upraviť</a>-->" +
                                "</td>";
                    html += "</tr>";
                };

                // Move on to the next object in store
                cursor.continue();
            }
            else {
                table.children("tbody").html(html);
                table.show();
                loader.hide();
            }
        };
    };
}

// save data
function indexedSaveData(data) {
    var result = dbi.request.result;
    var save = {name: data.name, surname: data.surname, email: data.email};
    var transaction = result.transaction([dbiName], "readwrite").objectStore(dbiName).add(save);

    // handler error
    transaction.onerror = function(event) {
        //alert("ERROR: Add row into indexed database.");
        console.log("ERROR: Add row into indexed database.");
        console.log(event);
    };

    // handler success
    transaction.onsuccess = function(event) {
        //alert("SUCCESS: Add row into indexed database.");
        console.log("SUCCESS: Add row into indexed database.");
        indexedListData();
        resetForm();
        loader.hide();
    };
}

// update data
function indexedUpdateRow(data) {
    //ndexedSaveData(data);
}

function indexedLoadData(id) {
    var result = dbi.request.result;
    var transaction = result.transaction(dbiName, "readwrite").objectStore(dbiName).get(id);

    // handler error
    transaction.onerror = function(event) {
        console.log("ERROR: Get row into indexed database.");
        console.log(event);
    };

    // handler success
    transaction.onsuccess = function(event) {
        console.log("SUCCESS: Get row into indexed database.");

        $("#id").val(id);
        $("#name").val(transaction.result.name);
        $("#surname").val(transaction.result.surname);
        $("#email").val(transaction.result.email);

        loader.hide();
    };
}

// remove row
function indexedRemoveRow(id) {
    var result = dbi.request.result;
    var transaction = result.transaction([dbiName], "readwrite").objectStore(dbiName).delete(id);

    // handler error
    transaction.onerror = function(event) {
        console.log("ERROR: Remove row into indexed database.");
        console.log(event);
    };

    // handler success
    transaction.onsuccess = function(event) {
        console.log("SUCCESS: Remove row into indexed database.");
        indexedListData();
        resetForm();
        loader.hide();
    };
}