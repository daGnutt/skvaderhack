/**
 * Performs a XMLHttpRequest and returns a promise.
 * @param {String} method Type of method. Currently supports GET and POST
 * @param {String} url The URL to send the request to
 * @param {Object|String} [payload] Either a string to send, or a JSON-parseable object.
 */
function makeRequest( method, url, payload )
{
	var valid_methods = [ "GET", "POST" ];
	if( !valid_methods.includes( method ) )
	{
		throw "Unsupported Method";
	}
	return new Promise( function( resolve, reject )
	{
		var xhr = new XMLHttpRequest();
		xhr.open( method, url );
		xhr.onload = function()
		{
			resolve( xhr );
		};
		xhr.onerror = function()
		{
			reject( { status: this.status, statusText: xhr.statusText } );
		};
		if( typeof( payload ) == "string" )
		{
			xhr.send( payload );
		}
		else if( typeof( payload ) == "object" )
		{
			xhr.send( JSON.stringify( payload ) );
		}
		else
		{
			xhr.send();
		}
	} );
}

makeRequest( 'GET', 'api/admin_key.py' ).then( function( request )
{
    hints = JSON.parse( request.responseText );
    var tableBody = document.querySelector("table#keys tbody");
    console.log(tableBody);
	for( var hintID in hints )
	{
        var hint = hints[ hintID ];

        var newRow = document.createElement("tr");
        
        var title = document.createElement("td");
        title.innerHTML = hint.key;

        var publish = document.createElement("td");
        publish.innerHTML = hint.publish;

        var hintdom = document.createElement("td");
        if(hint.url) {
            hintdom.innerHTML = "<a href=\"" + hint.url + "\">" + hint.description + "</a>";
        } else {
            hintdom.innerHTML = hint.description;
        }

        var score1dom = document.createElement("td");
        score1dom.innerHTML = hint.scores[0];

        var score2dom = document.createElement("td");
        score2dom.innerHTML = hint.scores[1];

        var score3dom = document.createElement("td");
        score3dom.innerHTML = hint.scores[2];

	var score4dom = document.createElement("td");
	score4dom.innerHTML = hint.scores[3];

        newRow.appendChild(title);
        newRow.appendChild(publish);
        newRow.appendChild(hintdom);
        newRow.appendChild(score1dom);
        newRow.appendChild(score2dom);
        newRow.appendChild(score3dom);
	newRow.appendChild(score4dom);

        tableBody.appendChild(newRow);
	}
} );
