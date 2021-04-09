export async function wait(ms){
  return new Promise((resolve, reject)=> {
    setTimeout(() => resolve(true), ms );
  });
}

// randomWait() is not quite random, but instead waits between 1 to 5
// times the seedTimeInMilliseconds.
export async function randomWait(index: number, seedTimeInMilliseconds: number = 1000) {
  const waitTime = seedTimeInMilliseconds * (1 + (index % 3))
  await wait(waitTime)
}