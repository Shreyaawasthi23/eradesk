// Mirrors SequenceGeneratorService.java's atomic findAndModify counter pattern.
export async function nextSequence(db, collection, seqName) {
  const doc = await db
    .collection(collection)
    .findOneAndUpdate({ _id: seqName }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' })
  return doc && typeof doc.seq === 'number' ? doc.seq : 1
}
