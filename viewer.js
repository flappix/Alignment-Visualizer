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
	
	this.fetch();
	
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
				selection.width (snd.screenX - fst.screenX);
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
		
		if (nt_width / nt_height < 0.5)
		{
			nts.html ('');
		}
		else
		{
			nts.each ( function (nt)
			{
				$(this).html ( $(this).data ('char') );
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
	

let alignment;
function init()
{
	let annotation = new Annotation ('files/bna.flcs.new.gtf');
	let genes = ['BnaA02g00370D', 'BnaA03g02820D', 'BnaA03g13630D', 'BnaA10g22080D', 'BnaC02g00490D', 'BnaC03g16530D', 'BnaC09g46500D', 'BnaC09g46540D', 'At5g10140'];
	
	let mode = document.location.href.split ('?')[1];
	
	setTimeout ( function()
	{
		if (mode == 'pairwise')
		{
			for (let i in genes)
			{
				console.log (`Loading alignment ${(Number(i) + 1)} from ${genes.length}`);
				let gene = genes[i];
				
				let aln_coolair = new Alignment (`files/fasta/alignments/${gene}_coolair.fasta`);
				aln_coolair.addAnnotation (annotation);
				aln_coolair.load();
				
				let aln_coolair_rev = new Alignment (`files/fasta/alignments/${gene}_coolair_reverse.fasta`);
				aln_coolair_rev.addAnnotation (annotation);
				aln_coolair_rev.load();
				
				let aln_coldair = new Alignment (`files/fasta/alignments/${gene}_coldair.fasta`);
				aln_coldair.addAnnotation (annotation);
				aln_coldair.load();
				
				let aln_rnd = new Alignment (`files/fasta/alignments/${gene}_random.fasta`);
				aln_rnd.addAnnotation (annotation);
				aln_rnd.load();
			}
		}
		else if (mode == 'multiple')
		{
			alignment = new Alignment ('files/fasta/alignments/all.flcs.fasta');
			alignment.addAnnotation (annotation);
			alignment.load();
		}
		
		$('#loading').css ('display', 'none');
		$('#viewer').show();
	}, 0);
	
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
};

init();
