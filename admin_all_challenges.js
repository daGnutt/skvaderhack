
function fetchHints()
{
	var fetcher = new XMLHttpRequest();
	fetcher.addEventListener( "load", parseHints );
	fetcher.open( "GET", "api/all_hints.py" );
	fetcher.send();
}

function parseHints()
{
	if(this.status != 200)
	{
		throw this;
	}
	killAllChildren(document.getElementById("hintlist"));
	var hints = JSON.parse(this.responseText);
	for(var hintid in hints)
	{
		var hint = hints[ hintid ];
		var hintdom = document.createElement("li");
		if( hint.url )
		{
			var anchor = document.createElement("a");
			anchor.href = hint.url;
			anchor.appendChild( document.createTextNode( hint.description ) );
			hintdom.appendChild( anchor );
		} else {
			hintdom.appendChild( document.createTextNode( hint.description ) );
		}
		hintdom.appendChild( document.createTextNode( " - " ) );
		hintdom.appendChild( document.createTextNode( hint.publish ) );
		document.getElementById("hintlist").appendChild(hintdom);
	}
}

function killAllChildren(dom)
{
	while(dom.firstChild)
	{
		dom.removeChild(dom.firstChild);
	}
}

fetchHints();
