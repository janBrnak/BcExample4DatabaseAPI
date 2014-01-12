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

    // phonegap doesn't support indexedDB
    if (DEVICE_TYPE == 'mobile') {
        $("label[for=indexed]").css("color", "#666666");
        $("input#indexed").attr("checked", false);
        $("input#indexed").attr("disabled", true);
        $("input#indexed").parent().append("&nbsp;(<span style='color:#ff0000'>Phonegap nepodporuje IndexedDB.</span>)");
    }

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

        // phonegap doesn't support indexedDB
        if(data.indexed && DEVICE_TYPE != 'mobile') {
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
            console.log("SUCCESS: Add row in websql database.");
        });
    });
}

// update data
function websqlUpdateRow(data) {
    db.transaction(function(tx) {
        tx.executeSql('UPDATE users SET name = "' + data.name + '", surname = "' + data.surname + '", email = "' + data.email + '" WHERE id = ' + data.id, [], function(tx, result) {
            websqlListData();
            resetForm();

            loader.hide();
            console.log("SUCCESS: Update row in websql database.");
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
            console.log("SUCCESS: Load row with id='" + row.id + "' from websql database.");
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
    dbi.indexedDB   = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    dbi.transaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    dbi.keyRange    = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

    if (!dbi.indexedDB) {
        alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
    }
    else {
        var request = dbi.indexedDB.open(dbiName, 1);

        // handler error
        request.onerror = function(event) {
            console.log("ERROR: Init indexed database.");
            console.log(event);
        };

        // this event is only implemented in recent browsers
        request.onupgradeneeded = function(event) {
            var dbr = event.target.result;

            // create an objectStore for this database
            var objectStore = dbr.createObjectStore(dbiName, {keyPath: "id", autoIncrement: true, unique: true});

            // create indexes
            objectStore.createIndex("name",     "name",     { unique: false });
            objectStore.createIndex("surname",  "surname",  { unique: false });
            objectStore.createIndex("email",    "email",    { unique: false });
        };

        // handler success
        request.onsuccess = function(event) {
            dbi.request = request;
            console.log("SUCCESS: Init indexed database.");

            // list saved data
            indexedListData();
        };
    }
}

// list data
function indexedListData(options) {
    var table = $("#indexedList");
    var html = "";
    var result = dbi.request.result;
    var store = result.transaction(dbiName, "readwrite").objectStore(dbiName);
    var request = null;

    // request count
    request = store.count();

    request.onsuccess = function(event) {
        // num rows event.target.result
    };

    request.onerror = function(event) {
        console.log("ERROR: Count from indexed database.");
        console.log(event);
    };

    // request open cursor
    request = store.openCursor();

    // open cursor error callback function
    request.onerror = function(event) {
        console.log("ERROR: Open cursor from indexed database.");
        console.log(event);
    }

    // open cursor success callback function
    request.onsuccess = function(event) {
        var cursor = event.target.result;

        if (cursor) {
            html += "<tr>";
                html += "<td>" + cursor.value.id + "</td>";
                html += "<td>" + cursor.value.name + "</td>";
                html += "<td>" + cursor.value.surname + "</td>";
                html += "<td>" + cursor.value.email + "</td>";
                html += "<td>" +
                            "<a href='JavaScript:void(0);' onclick='indexedRemoveRow(" + cursor.key + ")' title='Zmazať'>Zmazať</a>&nbsp;/&nbsp;" +
                            "<a href='JavaScript:void(0);' onclick='indexedLoadData(" + cursor.key + ")' title='Upraviť'>Upraviť</a>" +
                        "</td>";
            html += "</tr>";

            // move on to the next object in store
            cursor.continue();
        }
        else {
            table.children("tbody").html(html);

            if (html && !table.is(":visible"))
                table.show();
            else if (!html && table.is(":visible"))
                table.hide();

            loader.hide();
        }
    };
}

// save data
function indexedSaveData(data) {
    var result = dbi.request.result;
    var save = {
            name: data.name,
            surname: data.surname,
            email: data.email
        };
    var request = result.transaction(dbiName, "readwrite").objectStore(dbiName).add(save);

    // handler error
    request.onerror = function(event) {
        console.log("ERROR: Add row into indexed database.");
        console.log(event);
    };

    // handler success
    request.onsuccess = function(event) {
        indexedListData();
        resetForm();

        loader.hide();
        console.log("SUCCESS: Add row into indexed database.");
    };
}

// update data
function indexedUpdateRow(data) {
    var result = dbi.request.result;
    var save = {
            id: parseInt(data.id),
            name: data.name,
            surname: data.surname,
            email: data.email
        };
    var request = result.transaction(dbiName, "readwrite").objectStore(dbiName).put(save);

    // handler error
    request.onerror = function(event) {
        console.log("ERROR: Update row in indexed database.");
        console.log(event);
    };

    // handler success
    request.onsuccess = function(event) {
        indexedListData();
        resetForm();

        loader.hide();
        console.log("SUCCESS: Update row in indexed database.");
    };
}

function indexedLoadData(id) {
    var result = dbi.request.result;
    var request = result.transaction(dbiName, "readonly").objectStore(dbiName).get(id);

    // handler error
    request.onerror = function(event) {
        console.log("ERROR: Get row into indexed database.");
        console.log(event);
    };

    // handler success
    request.onsuccess = function(event) {
        if (request.result != undefined) {
            $("#id").val(request.result.id);
            $("#name").val(request.result.name);
            $("#surname").val(request.result.surname);
            $("#email").val(request.result.email);

            loader.hide();
            console.log("SUCCESS: Load row with id='" + request.result.id + "' from indexed database.");
        }
        else {
            loader.hide();
            console.log("WARRNING: Not found row with id='" + id + "' in indexed database.");
        }
    };
}

// remove row
function indexedRemoveRow(id) {
    var result = dbi.request.result;
    var request = result.transaction(dbiName, "readwrite").objectStore(dbiName).delete(id);

    // handler error
    request.onerror = function(event) {
        console.log("ERROR: Remove row with id='" + id + "' from indexed database.");
        console.log(event);
    };

    // handler success
    request.onsuccess = function(event) {
        indexedListData();
        resetForm();

        loader.hide();
        console.log("SUCCESS: Remove row with id='" + id + "' from indexed database.");
    };
}