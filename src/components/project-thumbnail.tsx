'use client';
import {useEffect,useRef} from 'react';
import type {Asset,Slide} from '@/lib/models';
import {drawSlide} from '@/lib/slide-canvas';
export function ProjectThumbnail({slide,asset,height}:{slide:Slide;asset?:Asset;height:number}){const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{let active=true;const buffer=document.createElement('canvas');void drawSlide(buffer,slide,asset,height).catch(()=>drawSlide(buffer,slide,undefined,height)).then(()=>{if(active&&ref.current){ref.current.width=300;ref.current.height=Math.round(height*300/1080);ref.current.getContext('2d')!.drawImage(buffer,0,0,ref.current.width,ref.current.height);}});return()=>{active=false;};},[slide,asset,height]);return <div className="project-thumbnail"><canvas ref={ref} aria-label={slide.headline}/></div>;}
