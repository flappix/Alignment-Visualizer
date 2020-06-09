let alignment;
let annotation = new Annotation ('files/bna.flcs.new.gtf');

let datasets = {
	'Pairwise Darmor-bzh': [],
	'Multiple Darmor-bzh': []
}

let genes = ['BnaA02g00370D', 'BnaA03g02820D', 'BnaA03g13630D', 'BnaA10g22080D', 'BnaC02g00490D', 'BnaC03g16530D', 'BnaC09g46500D', 'BnaC09g46540D', 'At5g10140'];
//let genes = ['BnaA10g22080D', 'At5g10140'];
//let mates = ['coolair_reverse_complement', 'coldair', 'coldair_reverse_complement'];
//let mates = ['coldair', 'coldair_complement','coldair_reverse','coldair_reverse_complement'];
let mates = ['coolair_reverse_complement', 'coldair'];

$(document).ready ( function()
{
	for (let gene of genes)
	{
		for (let mate of mates)
		{
			datasets['Pairwise Darmor-bzh'].push ( new Alignment (`files/fasta/alignments/${gene}_${mate}.fasta`) );
		}
	}
	
	datasets['Multiple Darmor-bzh'].push ( new Alignment ('files/fasta/alignments/all.flcs.fasta') );
});

function loadDataset (name)
{
	$('#loading').html (`Loading ${name}...`);
	$('#loading').show();
	
	setTimeout ( function()
	{
		for (let i in datasets[name])
		{
			let d = datasets[name][i];
			
			console.log (`Loading alignment ${(Number(i) + 1)} / ${datasets[name].length}`);
			d.fetch();
			d.addAnnotation (annotation);
			d.load();
		}
		
		$('#loading').css ('display', 'none');
	}, 0);
}
