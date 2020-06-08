let alignment;
let annotation = new Annotation ('files/bna.flcs.new.gtf');
let genes = ['BnaA02g00370D', 'BnaA03g02820D', 'BnaA03g13630D', 'BnaA10g22080D', 'BnaC02g00490D', 'BnaC03g16530D', 'BnaC09g46500D', 'BnaC09g46540D', 'At5g10140'];

let mode = document.location.href.split ('?')[1];
mode = mode == null ? 'pairwise' : mode;

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
