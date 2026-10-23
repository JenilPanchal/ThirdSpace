export const palette=['#FFF9EB','#344A47','#111827','#7A5547','#D88761','#F0B67F','#F5D76E','#B8CC9D','#60936B','#39776E','#77B7C4','#527DA8','#8A78AF','#CF8BB1','#D65F63','#B9B5AD'];
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function createPixelCanvas({now=Date.now}={}) {
  const width=32,height=24,pixels=Array(width*height).fill(palette[0]),budgets=new Map();
  const budget=id=>{
    let value=budgets.get(id);
    if(!value || now()>=value.resetAt){value={remaining:2,resetAt:0};budgets.set(id,value);}
    return value;
  };
  return {
    snapshot(id){return {width,height,pixels,palette,budget:id?{...budget(id)}:{remaining:0,resetAt:0},cooldownMs:60000};},
    place(id,x,y,color){
      if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=width||y<0||y>=height||!palette.includes(color))fail(400,'Choose a square and a color from the palette.');
      const value=budget(id);
      if(value.remaining<=0)fail(429,'Your next two pixels are almost ready. Watch the countdown.');
      if(pixels[y*width+x]===color)fail(409,'That square already has this color. Choose another one.');
      if(value.resetAt===0)value.resetAt=now()+60000;
      value.remaining--;pixels[y*width+x]=color;
    },
  };
}
