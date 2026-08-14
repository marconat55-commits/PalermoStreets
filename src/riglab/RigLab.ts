import { Application, Assets, Container, Graphics, Sprite, Text } from 'pixi.js';
import { RIG_MOTIONS, type JointPose, type RigFrame, type RigMotion } from './motions';

const WIDTH = 1280;
const HEIGHT = 720;
const MASTER = '/assets/characters/merco_anim/idle/01.png';
const BONES: Array<[string, string]> = [
  ['head','neck'], ['neck','shoulderL'], ['shoulderL','elbowL'], ['elbowL','handL'],
  ['neck','shoulderR'], ['shoulderR','elbowR'], ['elbowR','handR'], ['neck','hipL'],
  ['neck','hipR'], ['hipL','hipR'], ['hipL','kneeL'], ['kneeL','footL'], ['hipR','kneeR'], ['kneeR','footR'],
];

export class RigLab {
  private readonly app = new Application();
  private readonly rig = new Container();
  private readonly skeleton = new Graphics();
  private readonly fire = new Graphics();
  private readonly hitboxes = new Graphics();
  private readonly status = new Text({ text: '', style: { fill: '#fff', fontSize: 18, fontFamily: 'Arial' } });
  private motion: RigMotion = RIG_MOTIONS[0]!;
  private frameIndex = 0;
  private elapsedMs = 0;
  private playing = true;

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({ width: WIDTH, height: HEIGHT, background: '#15171d', antialias: true });
    host.replaceChildren(this.app.canvas);
    this.app.stage.addChild(this.makeBackdrop(), this.rig, this.makeUi());
    this.rig.position.set(430, 600);

    try {
      const texture = await Assets.load(MASTER);
      const ghost = new Sprite(texture);
      ghost.anchor.set(0.5, 1);
      ghost.alpha = 0.22;
      ghost.height = 330;
      ghost.scale.x = ghost.scale.y;
      this.rig.addChild(ghost);
    } catch {
      this.status.text = 'Master runtime Merco non trovato: scheletro disponibile.';
    }
    this.rig.addChild(this.fire, this.skeleton, this.hitboxes);
    this.renderFrame(this.motion.frames[0]!);
    this.app.ticker.add((ticker) => this.update(ticker.deltaMS));
  }

  private makeBackdrop(): Container {
    const layer = new Container();
    const grid = new Graphics().rect(0,0,WIDTH,HEIGHT).fill(0x15171d);
    for (let x=0;x<=WIDTH;x+=40) grid.moveTo(x,100).lineTo(x,680);
    for (let y=120;y<=680;y+=40) grid.moveTo(0,y).lineTo(WIDTH,y);
    grid.stroke({ color: 0x2a2f3a, width: 1 });
    grid.moveTo(0,600).lineTo(WIDTH,600).stroke({ color:0xffc32b, width:2 });
    layer.addChild(grid);
    return layer;
  }

  private makeUi(): Container {
    const ui = new Container();
    const title = new Text({ text:'PALERMO STREETS — RIG LAB (prototipo)', style:{fill:'#ffc32b',fontSize:26,fontWeight:'bold'} });
    title.position.set(28,22); ui.addChild(title);
    const note = new Text({ text:'Master fisso + biomeccanica numerica. Nessuna immagine viene rigenerata.', style:{fill:'#b8c0cc',fontSize:15} });
    note.position.set(30,57); ui.addChild(note);
    RIG_MOTIONS.forEach((motion,index)=>{
      const button = new Text({ text:`${index+1}  ${motion.label}`, style:{fill:'#fff',fontSize:17} });
      button.position.set(30,110+index*42); button.eventMode='static'; button.cursor='pointer';
      button.on('pointertap',()=>this.selectMotion(motion)); ui.addChild(button);
    });
    const help = new Text({ text:'SPAZIO pausa/riprendi  •  ←/→ frame  •  1–4 animazione', style:{fill:'#8fd5ff',fontSize:15} });
    help.position.set(30,310); ui.addChild(help);
    this.status.position.set(30,650); ui.addChild(this.status);
    window.addEventListener('keydown',(event)=>this.onKey(event));
    return ui;
  }

  private selectMotion(motion: RigMotion): void {
    this.motion=motion; this.frameIndex=0; this.elapsedMs=0; this.playing=true;
    this.renderFrame(motion.frames[0]!);
  }

  private onKey(event: KeyboardEvent): void {
    if(event.code==='Space'){event.preventDefault();this.playing=!this.playing;return;}
    const index=Number(event.key)-1;
    if(index>=0 && index<RIG_MOTIONS.length){this.selectMotion(RIG_MOTIONS[index]!);return;}
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
      event.preventDefault(); this.playing=false;
      const direction=event.key==='ArrowRight'?1:-1;
      this.frameIndex=(this.frameIndex+direction+this.motion.frames.length)%this.motion.frames.length;
      this.renderFrame(this.motion.frames[this.frameIndex]!);
    }
  }

  private update(deltaMs: number): void {
    if(!this.playing)return;
    const current=this.motion.frames[this.frameIndex]!; this.elapsedMs+=deltaMs;
    if(this.elapsedMs<current.durationMs)return;
    this.elapsedMs-=current.durationMs; this.frameIndex+=1;
    if(this.frameIndex>=this.motion.frames.length){
      this.frameIndex=this.motion.loop?0:this.motion.frames.length-1;
      if(!this.motion.loop)this.playing=false;
    }
    this.renderFrame(this.motion.frames[this.frameIndex]!);
  }

  private renderFrame(frame: RigFrame): void {
    this.rig.position.set(430+frame.rootX,600+frame.rootY);
    this.skeleton.clear();
    BONES.forEach(([a,b])=>{
      const p=frame.joints[a]; const q=frame.joints[b]; if(!p||!q)return;
      this.skeleton.moveTo(p.x,p.y).lineTo(q.x,q.y).stroke({color:0xeff5ff,width:14});
      this.skeleton.moveTo(p.x,p.y).lineTo(q.x,q.y).stroke({color:0x319cff,width:5});
    });
    Object.values(frame.joints).forEach((joint:JointPose)=>this.skeleton.circle(joint.x,joint.y,7).fill(0xffc32b).stroke({color:0x111111,width:2}));
    this.fire.clear();
    if(frame.fire){
      const hand=frame.joints.handR!;
      this.fire.circle(hand.x,hand.y,28+frame.fire*35).fill({color:0xff4b16,alpha:.35});
      this.fire.circle(hand.x-15,hand.y+8,16+frame.fire*23).fill({color:0xffcf28,alpha:.7});
      this.fire.moveTo(hand.x-90*frame.fire,hand.y+20).bezierCurveTo(hand.x-55,hand.y-45,hand.x-25,hand.y+35,hand.x,hand.y).stroke({color:0xff6a18,width:18*frame.fire});
    }
    this.hitboxes.clear();
    if(frame.hit)this.hitboxes.roundRect(70,-180,170,150,18).fill({color:0xff3030,alpha:.16}).stroke({color:0xff4545,width:3});
    this.status.text=`${this.motion.label}  •  frame ${this.frameIndex+1}/${this.motion.frames.length}  •  ${frame.durationMs} ms${frame.hit?'  •  HIT':''}${frame.invulnerable?'  •  INVULNERABILE':''}`;
  }

}
