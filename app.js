console.log("Loaded app.js");

document.getElementById("btnGroupCreate").addEventListener( "click", btnGroupCreate_Click );
document.getElementById("btnGroupLogin").addEventListener( "click", btnGroupLogin_Click );
document.getElementById("btnLogout").addEventListener( "click", btnLogout_Click );
document.getElementById("btnKeySubmit").addEventListener( "click", btnKeySubmit_Click );
document.getElementById("txtKeySubmit").addEventListener( "keyup", txtKeySubmit_Keyup );

document.querySelectorAll("#login input").forEach((a) => {a.addEventListener( "keyup", txtLogin_KeyUp );});


if( location.protocol === 'http:' )
{
	window.location.replace("https://skvaderhack.xyz");
}

tmrFindGroups = null
function txtLogin_KeyUp()
{
	if(this.id == "txtGroupName")
	{
		if( tmrFindGroups )
		{
			clearTimeout(tmrFindGroups);
		}
		tmrFindGroups = setTimeout( initFetchGroupList, 300 );
	}

	checkLoginButton();

	if( event.keyCode == 13 )
	{
		if( document.getElementById("btnGroupCreate").disabled == false )
		{
			btnGroupCreate_Click();
		}

		if( document.getElementById("btnGroupLogin").disabled == false )
		{
			btnGroupLogin_Click();
		}
	}
}

function initFetchGroupList()
{
	clearTimeout( tmrFindGroups );
	tmrFindGroups = null;

	searchValue = document.getElementById( "txtGroupName" ).value;
	fetchGroupList( searchValue );
}

function checkLoginButton()
{
	var enteredGroup = document.getElementById("txtGroupName").value;
	var enteredPassw = document.getElementById("txtGroupPwd").value;
	var lstGroupFirstMatch = document.getElementById("lstGroups").firstChild;
	
	if( lstGroupFirstMatch != null )
	{
		if( enteredGroup == lstGroupFirstMatch.value && enteredPassw.length > 0 )
		{
			document.getElementById("btnGroupLogin").disabled = false;
		} else {
			document.getElementById("btnGroupLogin").disabled = true;
		}
	}
	
	var foundGroup = false;
	allGroups = document.getElementById("lstGroups").children
	for( element in allGroups )
	{
		dom = allGroups[ element ];
		if( dom.value == enteredGroup )
		{
			foundGroup = true;
			break;
		}
	}
	if( foundGroup == false && enteredPassw.length > 0)
	{
		document.getElementById( "contacthider" ).style.display = "block";
		document.getElementById("btnGroupCreate").disabled = false;
	} else {
		document.getElementById( "contacthider" ).style.display = "none";
		document.getElementById("btnGroupCreate").disabled = true;
	}
}

lastSearch = null;
function fetchGroupList( searchterm )
{
	if( lastSearch != searchterm )
	{
		lastSearch = searchterm;
		var request = new XMLHttpRequest();
		    request.addEventListener( "load", updateGroupList );
		    request.open("GET", "api/groups.py?search=" + searchterm);
		    request.send();
	}
}

function updateGroupList()
{
	killAllChildren( document.getElementById("lstGroups") );
	groups = JSON.parse( this.responseText );
	for( groupnum in groups )
	{
		group = groups[ groupnum ];
		newNode = document.createElement("option");
		newNode.value = group;
		document.getElementById("lstGroups").appendChild(newNode);
	}

}

function killAllChildren( domElement )
{
	while( domElement.firstChild )
	{
		domElement.removeChild(domElement.firstChild);
	}
}

function btnGroupCreate_Click()
{
	showMessage( "You tried to create a group...");
}

function btnGroupLogin_Click()
{
	username = document.getElementById("txtGroupName").value;
	password = document.getElementById("txtGroupPwd").value;

	payload = {
		"action": "login",
		"username": username,
		"password": password
	}

	var request = new XMLHttpRequest();
	    request.addEventListener( "load", parseLogin );
	    request.open("POST", "api/auth.py");
	    request.send(JSON.stringify(payload))
}

function btnLogout_Click() {
	localStorage.removeItem('authtoken');
	location.reload();
}

function parseLogin()
{
	if( this.status == 200 )
	{
		localStorage.setItem( "authtoken", JSON.parse(this.responseText) );
		showMessage( "You are logged in ");
		document.getElementById("login").style.display = 'none';
		document.getElementById("keysubmit").style.display = 'block';

		fetchGroupStatus();
	} else {
		showMessage( this.responseText );
	}
}

messageTimeout = null;

function showMessage( message, messagetype, timeout )
{
	messagedom = document.getElementById("message");
	if( messagetype == "warning" )
	{
		messagedom.style.background = "rgb(255,0,0)";
		messagedom.style.color = "rgb(255,255,255)";
	} else {
		messagedom.style.background = "rgb(128,0,128)";
		messagedom.style.color = "rgb(0,0,0)";
	}

	closeblock = " <span class=\"clickable\" onClick=\"hideMessage();\">[&times]</span>";

	messagedom.innerHTML = message + closeblock;
	messagedom.style.display = "block";

	if( messageTimeout != null) {
		clearTimeout( messageTimeout );
	}

	if(typeof(timeout) == "undefined")
	{
		numchar = message.length;
		timeout = 120 * numchar;
	}
	messageTimeout = setTimeout( hideMessage, timeout );
}

function hideMessage()
{
	clearTimeout( messageTimeout );
	messageTimeout = null;
	document.getElementById("message").style.display = "none";
	document.getElementById("message").innerHTML = "";
}

function checkLoginState()
{
	var authtoken = localStorage.getItem( "authtoken" );
	if( authtoken != null ) //Authtoken exists
	{
		document.querySelectorAll("#login input").forEach((a) => {a.disabled = true;});
		var payload = {"action": "authtoken", "token": authtoken };
		var validator = new XMLHttpRequest();
		    validator.addEventListener( "load", parseAuthToken );
		    validator.open( "POST", "api/auth.py" );
		    validator.send( JSON.stringify( payload ) );

		document.getElementById( "btnKeySubmit" ).disabled = true;
	} else { //No Authtoken exists
		document.querySelectorAll("#login input").forEach((a) => {a.disabled = false;});
		document.getElementById("txtGroupName").disabled = false;
		document.getElementById("txtGroupName").focus();
		document.getElementById("txtGroupPwd").disabled = false;
		document.getElementById("login").style.display = 'block';
		document.getElementById("keysubmit").style.display = 'none';

		fetchGroupList( "" );

		var fetchScoreboard = new XMLHttpRequest();
		fetchScoreboard.addEventListener( "load", parseScoreboard );
		fetchScoreboard.open( "GET", "api/score.py" );
		fetchScoreboard.send();
	}
}

function parseScoreboard()
{
	if( this.status != 200 )
	{
		throw "Could not fetch scoreboard";
	}
	try
	{
		scores = JSON.parse( this.responseText );
		showScoreboard( scores );
	}
	catch(e)
	{
		alert("Could not parse scoreboard");
	}
}

function parseAuthToken()
{
	if( this.status == 200 ) //Authtoken is valid
	{
		document.getElementById("login").style.display = 'none';
		document.getElementById("keysubmit").style.display = 'block';
		document.getElementById("txtKeySubmit").focus();

		fetchGroupStatus();
	} else { //Authtoken is not valid, force login.
		console.log( "Forcing Login" );
		document.getElementById("login").style.display = 'block';
		document.getElementById("keysubmit").style.display = 'none';
		document.querySelectorAll("#login input").forEach((a) => {a.disabled = false;});
		document.getElementById("txtGroupName").focus();
		
	}
}

function txtKeySubmit_Keyup()
{
	if( document.getElementById( "txtKeySubmit" ).value.length < 1 )
	{
		document.getElementById( "btnKeySubmit" ).disabled = true;
	} else {
		if( event.keyCode == 13 )
		{
			btnKeySubmit_Click();
		}

		if( event.keyCode == 27 )
		{
			hideMessage();
		}
		document.getElementById( "btnKeySubmit" ).disabled = false;
	}
}

function btnKeySubmit_Click()
{	var key = document.getElementById("txtKeySubmit").value.trim();
	var payload = {"action": "submitkey",
		"authtoken": localStorage.getItem("authtoken"),
		"key": key}

	var sender = new XMLHttpRequest();
	    sender.addEventListener( "load", parseKeySubmit );
	    sender.open( "POST", "api/key.py" );
	    sender.send( JSON.stringify( payload ) );

	document.getElementById("txtKeySubmit").disabled = true;
	document.getElementById("btnKeySubmit").disabled = true;
}

function parseKeySubmit()
{
	document.getElementById("txtKeySubmit").disabled = false;
	document.getElementById("btnKeySubmit").disabled = false;

	if( this.status == 200 ) //A correct key was supplied
	{
		showMessage( "A correct key was supplied" );
	} else {
		try
		{
			parsed = JSON.parse( this.responseText );
			groupstatus( parsed );
			showMessage( "That key was incorrect" );
		}
		catch(SyntaxError) {
			showMessage( this.responseText );
		}
	}

	document.getElementById("txtKeySubmit").focus();
	document.getElementById("txtKeySubmit").select();
}

function fetchGroupStatus()
{
	var payload = {"action": "groupstatus", "authtoken": localStorage.getItem("authtoken") }

	var fetcher = new XMLHttpRequest();
	    fetcher.addEventListener( "load", parseGroupStatus );
	    fetcher.open( "POST", "api/key.py" );
	    fetcher.send( JSON.stringify( payload ) );
}

function parseGroupStatus()
{
	parsed = JSON.parse( this.responseText );
	groupstatus( parsed );
}

tmrGroupStatus = null;
function groupstatus(new_status)
{
	if( tmrGroupStatus )
	{
		clearTimout( tmrGroupStatus );
		tmrGroupStatus = null;
	}

	tmrGropuStatus = setTimeout( fetchGroupStatus, 60000 );

	var groupscore = new_status.points.filter(function(a) { return a.name == new_status.group; } );
	groupscore = groupscore[0].score;

	showScoreboard(new_status.points);
	document.getElementById("lblGroupScore").innerHTML = groupscore;
	document.getElementById("lblWrongCounter").innerHTML = new_status.remain_guess;

	var nextguess = new Date(new_status.time_to_new_guess + " UTC");
	var nexthours = nextguess.getHours();
	if( nexthours < 10 )
	{
		nexthours = "0" + nexthours;
	}

	var nextminutes = nextguess.getMinutes();
	if( nextminutes < 10 )
	{
		nextminutes = "0" + nextminutes;
	}

	document.getElementById("lblWrongCountdown").innerHTML = nexthours + ":" + nextminutes;

	if( new_status.remain_guess == 3 )
	{
		document.getElementById( "nextGuess" ).style.display = 'none';
	} else {
		document.getElementById( "nextGuess" ).style.display = 'block';
	}

	if( new_status.remain_guess < 1 )
	{
		document.getElementById( "btnKeySubmit" ).disabled = true;
		document.getElementById( "txtKeySubmit" ).disabled = true;
	} else {
		if( document.getElementById( "txtKeySubmit" ).value.length < 1 )
		{
			document.getElementById( "btnKeySubmit" ).disabled = true;
		} else {
			document.getElementById( "btnKeySubmit" ).disabled = false;
		}
		document.getElementById( "txtKeySubmit" ).disabled = false;
		document.getElementById( "txtKeySubmit" ).focus();
	}

}

function showScoreboard(scores)
{
	scores.sort(function (a,b) { return b.score - a.score; } );

	killAllChildren(document.getElementById("scoreboard"));

	for( pos in scores )
	{
		group = scores[ pos ];
		container = document.createElement("div");
		container.classList.add("score-item");

		groupname = document.createElement("div");
		groupname.innerHTML = group["name"];
		groupname.classList.add("name");

		points = document.createElement("div");
		points.innerHTML = group["score"];
		points.classList.add("score");

		container.appendChild(groupname);
		container.appendChild(points);

		document.getElementById("scoreboard").appendChild(container);
	}
}

checkLoginState();
