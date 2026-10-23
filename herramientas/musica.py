import numpy as np, wave, sys
dur=float(sys.argv[2]); bpm=float(sys.argv[3]); out=sys.argv[1]; hits=[float(x) for x in sys.argv[4].split(',')] if len(sys.argv)>4 and sys.argv[4] else []
sr=44100; n=int(dur*sr); t=np.arange(n)/sr; y=np.zeros(n)
def note(f): return 440*2**((f-69)/12)
prog=[[50,57,62,65],[46,53,58,62],[53,57,60,65],[48,55,60,64]]  # Dm Bb F C
bar=60/bpm*4
for i in range(int(dur/bar)+1):
    ch=prog[i%4]; s=int(i*bar*sr); e=min(n,int((i+1)*bar*sr)+sr)
    if s>=n: break
    tt=t[s:e]-i*bar
    env=np.minimum(1,tt/0.8)*np.exp(-tt/5)
    for m in ch:
        f=note(m); y[s:e]+=0.05*env*(np.sin(2*np.pi*f*tt)+0.3*np.sin(2*np.pi*2*f*tt+0.4)+0.15*np.sin(2*np.pi*f*1.002*tt))
    # bajo
    f=note(ch[0]-12); y[s:e]+=0.08*np.exp(-tt/1.2)*np.sin(2*np.pi*f*tt)
    # arpegio
    for k in range(8):
        st=i*bar+k*bar/8; ss=int(st*sr); ee=min(n,ss+int(0.6*sr))
        if ss>=n: break
        t2=t[ss:ee]-st; f=note(ch[(k*3)%4]+12)
        y[ss:ee]+=0.035*np.exp(-t2/0.25)*np.sin(2*np.pi*f*t2)
# pulso suave (kick)
beat=60/bpm
for k in range(int(dur/beat)):
    ss=int(k*beat*sr); ee=min(n,ss+int(0.35*sr)); t2=t[ss:ee]-k*beat
    y[ss:ee]+=0.22*np.exp(-t2/0.09)*np.sin(2*np.pi*(48+90*np.exp(-t2/0.03))*t2)
    if k%2==1:
        ns=np.random.RandomState(k).randn(ee-ss); y[ss:ee]+=0.03*np.exp(-t2/0.03)*ns
for h in hits:  # golpe de "mazo" en cortes
    ss=int(h*sr); ee=min(n,ss+int(0.8*sr)); t2=t[ss:ee]-h
    y[ss:ee]+=0.35*np.exp(-t2/0.12)*(np.sin(2*np.pi*95*t2)+0.5*np.sin(2*np.pi*190*t2))+0.08*np.exp(-t2/0.02)*np.random.RandomState(1).randn(ee-ss)
fade=np.minimum(1,np.minimum(t/0.5,(dur-t)/1.5)); y*=fade
y=y/np.max(np.abs(y))*0.85
st=np.stack([y,np.roll(y,90)],1)
w=wave.open(out,'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close()
