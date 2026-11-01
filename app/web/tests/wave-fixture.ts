export function waveFixture() {
 const rate=8000,samples=8000,buffer=Buffer.alloc(44+samples*2);
 buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);
 buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples*2,40);
 for(let index=0;index<samples;index++){const amplitude=index<2000||index>=6000?0:index<4000?.2:.8;buffer.writeInt16LE(Math.round(Math.sin(index*.2)*amplitude*32767),44+index*2);}
 return buffer;
}
