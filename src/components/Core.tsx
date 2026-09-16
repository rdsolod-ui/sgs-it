import {Component,Suspense,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import {useGLTF,ContactShadows} from '@react-three/drei';
import {Group,Mesh,Vector3,MathUtils} from 'three';
class Boundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true};}render(){return this.state.failed?<div className="core-fallback" aria-hidden="true"><i/><i/><i/><i/></div>:this.props.children;}}
function Sculpture({state,reduced}:{state:string,reduced:boolean}){
 const {scene}=useGLTF(import.meta.env.BASE_URL+'models/sgs-core.glb',false,false);useEffect(()=>{document.querySelector('.core-canvas')?.setAttribute('data-loaded','true');},[]);const clone=useMemo(()=>scene.clone(true),[scene]);const ref=useRef<Group>(null);const modules=useMemo(()=>{const a:{mesh:Mesh,base:Vector3}[]=[];clone.traverse(o=>{if(o.name.startsWith('Module'))a.push({mesh:o as Mesh,base:o.position.clone().normalize().multiplyScalar(Math.sqrt(3)*.56)});});return a;},[clone]);
 useFrame(({clock,pointer},delta)=>{if(!ref.current)return;const t=clock.elapsedTime;const busy=state==='thinking';const spread=state==='presenting'?1.48:busy?1.22:state==='responding'?1.16:1.07;
 ref.current.rotation.x=MathUtils.damp(ref.current.rotation.x,.2+(reduced?0:pointer.y*.08),4,delta);
 ref.current.rotation.y=reduced?.5:.5+Math.sin(t*.18)*.18+pointer.x*.09;
 ref.current.rotation.z=-.13;ref.current.position.y=reduced?0:Math.sin(t*.8)*.045;
 for(const {mesh,base} of modules){const target=base.clone().multiplyScalar(spread);if(reduced)mesh.position.copy(target);else mesh.position.lerp(target,1-Math.exp(-delta*3));}
 });
 return <group ref={ref} rotation={[.2,.5,-.13]}><primitive object={clone}/></group>;
}
export function Core({state,dark,reduced}:{state:string,dark:boolean,reduced:boolean}){const [visible,setVisible]=useState(!document.hidden);useEffect(()=>{const f=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',f);return()=>document.removeEventListener('visibilitychange',f);},[]);return <div className="core-canvas" role="img" aria-label="Синк — модульное ядро цифрового интеллекта"><Boundary><Canvas dpr={[1,1.5]} camera={{position:[0,1.1,6.7],fov:35}} frameloop={visible?(reduced?'demand':'always'):'never'} onCreated={s=>{if(import.meta.env.DEV)(window as any).__sgsThree=s;}} gl={{alpha:true,antialias:true,powerPreference:'low-power'}}><ambientLight intensity={dark?1.3:1.9}/><directionalLight position={[4,6,4]} intensity={4}/><directionalLight position={[-4,2,-1]} color="#5277ef" intensity={dark?5:2}/><pointLight position={[0,0,3]} intensity={8}/><Suspense fallback={null}><Sculpture state={state} reduced={reduced}/><ContactShadows frames={1} position={[0,-1.6,0]} opacity={dark?.28:.17} scale={8} blur={2.5} far={4} resolution={128}/></Suspense></Canvas></Boundary></div>;}
