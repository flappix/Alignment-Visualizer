let curr_alignment = null;

function Alignment (url)
{
	let name = '';
	let seqs = [];
	let seqs_map = {};
	let aln_div = $('<div class="alignment"></div>');
	let nt_width = 0;
	let nt_height = 0;
	let maxSeqLength = 0;
	let selectRegionStart = null;
	let selectRegionEnd = null;
	
	let nts = null;
	
	this.fetch = function()
	{
		$.ajax({
			url: url,
			async: false,
			success: (result) => {
				let data = result.split ('\n');
				for (let line of data)
				{
					if (line.charAt (0) != '#')
					{
						if (line.charAt (0) == '>')
						{
							let seq = {'name': line.substr (1), seq: '', annotations: []};
							seqs.push (seq);
							seqs_map[seq.name] = seq;
						}
						else
						{
							seqs[seqs.length - 1].seq += line;
						}
					}
				}
			}
		});
		
		let container = $('<div class="flex_container"></div>');
		$('#viewer').append (container);
		
		let seq_labels = $('<div class="seq_labels"><div>');
		container.append (seq_labels);
		container.append (aln_div);
		
		name = seqs.map (x => x.name).join ('_');
		
		for (let i in seqs)
		{
			let seq = seqs[i];
			seq_labels.append ( $(`<div class="seq_label">${seq.name}</div>`) );
			aln_div.append ( $(`<div id="${name}_seq_${seq.name}" class="seq"></div>`) );
		}
		
		/*aln_div.on ('wheel', (evt) =>
		{
			this.zoom (evt.originalEvent.deltaY > 0 ? 1 : -1);
		});*/
		
		container.on ('click', (evt) =>
		{
			if (evt.which == 1) // left click
			{
				curr_alignment = this;
				$('.active').removeClass ('active');
				container.addClass ('active');
			}
		});
		
		maxSeqLength = Math.max ( ...seqs.map (x => x.seq.length) );
		
		let goto_div = $('<div class="goto"></div>');
		let goto = $('<input type="text" placeholder="goto position" />');
		goto.on ('keydown', (evt) =>
		{
			if (evt.keyCode == 13) // enter
			{
				try
				{
					let pos = Number (goto.val());
					if (pos >= 0 && pos <= maxSeqLength)
					{
						aln_div.scrollLeft (pos * nt_width);
					}
				}
				catch (error) {}
				
				goto.val ('');
				goto.blur();
			}
		});
		
		goto_div.append (goto);
		seq_labels.append (goto_div);
	}
	
	this.addAnnotation = function (annotation)
	{
		for (let a of annotation.annotations)
		{
			let seq = seqs_map[a.seq];
			if (seq != null)
			{
				seq.annotations.push (a);
			}
		}
	}
	
	this.load = function()
	{
		this.zoomFitToPage (apply=false);
		nt_height = 20;
		
		let fst_nt_top;
		for (let i in seqs)
		{
			let seq = seqs[i];
			
			let nt_str = ``;
			let ungapped_pos = 0;
			for (let pos in seq.seq)
			{
				let char = seq.seq.charAt (pos);
				
				let classes = 'nt';
				if (char == '-')
				{
					classes += ' gap';
				}
				else
				{
					ungapped_pos++;
				}
				
				let refChar = seqs[0].seq.charAt (pos);
				if (i > 0 && refChar != '-' && char != refChar)
				{
					classes += ' mismatch';
				}
				
				for (let a of seq.annotations)
				{
					if (ungapped_pos >= a.start && ungapped_pos <= a.end)
					{
						classes += ` ${a.type}`;
					}
				}
				
				nt_str += `<span data-pos="${pos}" data-ungapped_pos="${ungapped_pos}" data-char="${char}" class="${classes}" style="width: ${nt_width}px;">${nt_width / nt_height >= 0.5 ? char : ''}</span>`
			}
			$(`#${name}_seq_${seq.name}`).append ($(nt_str));
			
			// needed for selection
			if (i == 0) fst_nt_top = $(`#${name}_seq_${seq.name} .nt`).first().offset().top;
		}
		
		nts = aln_div.find ('.nt');
		
		aln_div.on ('mousedown', (evt) =>
		{
			if (evt.which == 1) // left click
			{
				if (nt_width / nt_height < 0.5)
				{
					this.selectRegionStart = {pos: evt.target.dataset.pos, screenX: evt.pageX};
				}
			}
		});
		
		$(document).on ('mousemove', (evt) =>
		{
			if (this.selectRegionStart != null)
			{
				this.selectRegionEnd = {screenX: evt.pageX};
				
				let selection = $('#selection');
				let fst = this.selectRegionStart.screenX < this.selectRegionEnd.screenX ? this.selectRegionStart : this.selectRegionEnd;
				let snd = fst == this.selectRegionStart ? this.selectRegionEnd : this.selectRegionStart;
				
				selection.css ('left', fst.screenX);
				selection.css ('top', fst_nt_top);
				selection.width ( snd.screenX - fst.screenX - Number ( selection.css ('border').charAt (0) ) * 2 );
				selection.height (nt_height * seqs.length);
				selection.show();
			}
		});
		
		$(document).on ('mouseup', (evt) =>
		{
			if (evt.which == 1) // left click
			{
				if (this.selectRegionStart != null)
				{	
					if ( evt.target != null && $(evt.target).hasClass ('nt') )
					{
						this.selectRegionEnd = {pos: evt.target.dataset.pos};
										
						let distance = Math.abs (this.selectRegionEnd.pos - this.selectRegionStart.pos);
						
						if (distance > 10)
						{
							nt_width = Math.round ( aln_div.width() / distance );
							this.applyZoom();
							aln_div.scrollLeft ( Math.min (this.selectRegionStart.pos, this.selectRegionEnd.pos) * nt_width );
						}
					}
					
					$('#selection').hide();
					this.selectRegionStart = null;
					this.selectRegionEnd = null;
				}
			}
		});
	}
	
	this.zoom = function (offset)
	{
		let zoomFactor = 0.8;
		
		if (offset < 0)
		{
			if ( Math.round ( maxSeqLength * nt_width * zoomFactor ) > Math.round ( aln_div.width() ) )
			{
				nt_width *= zoomFactor;
			}
			else
			{
				nt_width = aln_div.width() / Math.max ( ...seqs.map (x => x.seq.length) )
			}
		}
		else
		{
			nt_width *= 1 + (1 - zoomFactor);
		}
			
		this.applyZoom();
	}
	
	this.zoomFitToPage = function (apply=true)
	{
		nt_width = aln_div.width() / maxSeqLength;
		if (apply) this.applyZoom();
	}
	
	this.applyZoom = function()
	{
		nts.width (nt_width);
		[...document.querySelectorAll(".myclass")].forEach(ele => ele.style.width=w)
		
		if (nt_width / nt_height < 0.5)
		{
			nts.html ('');
			$('#viewer').css ('user-select', 'auto');
		}
		else
		{
			nts.each ( function (nt)
			{
				$(this).html ( $(this).data ('char') );
				$('#viewer').css ('user-select', 'auto');
			});
		}
	}
}

function Annotation (url)
{
	this.annotations = [];
	
	this.fetch = function()
	{
		$.ajax({
			url: url,
			async: false,
			success: (result) => {
				let data = result.split ('\n');
				for (let line of data)
				{
					if (line.trim() != '' && line.charAt (0) != '#')
					{
						let fields = line.split ('\t');
						this.annotations.push ({seq: fields[0], start: fields[3] - 1, end: fields[4] - 1, type: fields[2], strand: fields[5]});
					}
				}
			}
		});
	}
	
	this.fetch();
}

$(document).ready ( function()
{
	$(document.body).append ( $('<div id="selection"></div>') );
	
	$(document).on ('keydown', function (evt)
	{
		if (curr_alignment != null)
		{
			if (evt.keyCode == 82) // [r]eset
			{
				curr_alignment.zoomFitToPage();
			}
			else if (evt.keyCode == 77) // m
			{
				curr_alignment.zoom (1);
			}
			else if (evt.keyCode == 78) // n
			{
				curr_alignment.zoom (-1);
			}
		}
	});
	
    $(document).tooltip({
		items: 'span',
		content: function () {
			return `nucleotide: ${this.dataset.char}<br />sequence position: ${this.dataset.ungapped_pos}<br />alignment position: ${this.dataset.pos}`;
		},
		show: {delay: 1000}
	});
});
