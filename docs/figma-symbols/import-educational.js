// Execute through Figma Desktop Bridge after replacing __SAMPLES__ with JSON.
const samples = __SAMPLES__;
await figma.loadAllPagesAsync();
const page = await figma.getNodeByIdAsync('0:1');
await figma.setCurrentPageAsync(page);
if (figma.root.name !== 'dala') throw new Error('Expected dala file');
if (page.children.some(n => n.name === 'DALA / Учебные образцы')) throw new Error('Section already exists; inspect before retry');
await figma.loadFontAsync({family:'Inter',style:'Regular'});
await figma.loadFontAsync({family:'Inter',style:'Semi Bold'});
const variables = await figma.variables.getLocalVariablesAsync();
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const semantic = collections.find(c => c.name === 'DALA Atlas / Semantic');
const vars = Object.fromEntries(variables.filter(v => v.variableCollectionId === semantic.id).map(v => [v.name,v]));
function paint(name) { return figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',vars['color/'+name]); }
function frame(parent,name,width,padding=24) {
  const n=figma.createFrame(); parent.appendChild(n); n.name=name; n.resize(width,100);
  n.layoutMode='VERTICAL'; n.primaryAxisSizingMode='AUTO'; n.counterAxisSizingMode='FIXED';
  n.paddingTop=n.paddingRight=n.paddingBottom=n.paddingLeft=padding; n.itemSpacing=16;
  n.fills=[paint('white')]; return n;
}
function text(parent,value,size=14,bold=false) {
  const n=figma.createText();parent.appendChild(n);n.fontName={family:'Inter',style:bold?'Semi Bold':'Regular'};
  n.fontSize=size;n.lineHeight={unit:'PIXELS',value:size+6};n.characters=value;
  n.fills=[paint('ink')];n.resize(parent.width-parent.paddingLeft-parent.paddingRight,20);n.textAutoResize='HEIGHT';return n;
}
const section=figma.createSection();section.name='DALA / Учебные образцы';
section.x=Math.max(...page.children.filter(n=>n.id!==section.id).map(n=>n.x+n.width))+160;section.y=2485;
const board=frame(section,'23 учебных образца · статус ВС РК не подтверждён',1440,48);board.x=48;board.y=48;board.fills=[paint('paper')];board.itemSpacing=24;
text(board,'УЧЕБНЫЕ ОБРАЗЦЫ / DALA',12,true);
text(board,'Тактические обозначения',32,true);
text(board,'Статус ВС РК не подтверждён. 13 знаков приложения и 10 перерисовок исторической таблицы. Каждый знак — отдельный редактируемый компонент.');
const mappings=[];
for(let i=0;i<samples.length;i+=4){
  const row=frame(board,'Ряд '+(i/4+1),1344,0);row.layoutMode='HORIZONTAL';row.primaryAxisSizingMode='FIXED';row.counterAxisSizingMode='AUTO';row.itemSpacing=24;row.fills=[];
  for(const sample of samples.slice(i,i+4)){
    const card=frame(row,sample.id+' / '+sample.name,318);
    const preview=frame(card,'Знак',270,0);preview.resize(270,112);preview.primaryAxisSizingMode='FIXED';preview.primaryAxisAlignItems='CENTER';preview.counterAxisAlignItems='CENTER';
    const component=figma.createComponent();preview.appendChild(component);component.name='Учебный / '+sample.name;component.resize(96,96);component.fills=[];
    component.description=sample.note+'\nИсточник: '+sample.source;component.exportSettings=[{format:'SVG',suffix:'',contentsOnly:true}];
    const svg=figma.createNodeFromSvg(sample.svg);component.appendChild(svg);svg.name='Векторный знак';
    const factor=Math.min(80/svg.width,80/svg.height);svg.rescale(factor);svg.x=(96-svg.width)/2;svg.y=(96-svg.height)/2;
    text(card,sample.name,16,true);text(card,'Статус ВС РК не подтверждён',12);text(card,sample.note,12);text(card,'Источник: '+sample.source,12);
    mappings.push({id:sample.id,componentId:component.id,cardId:card.id,source:sample.source});
  }
}
section.resizeWithoutConstraints(1536,board.height+96);
figma.viewport.scrollAndZoomIntoView([board]);
return {sectionId:section.id,boardId:board.id,mappings,createdNodeIds:[section.id,...section.findAll().map(n=>n.id)],bounds:{x:section.x,y:section.y,width:section.width,height:section.height}};
