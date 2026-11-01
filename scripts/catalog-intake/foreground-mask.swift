// Local, non-generative foreground mask (decision 0016) with macOS Vision's on-device foreground segmentation. It writes
// only the mask, as raw 8-bit alpha (row-major, one byte per pixel, no colour management), and its size; it never writes
// or alters image pixels. cutout.mjs compose applies it to the original's stored RGB.
// Build: swiftc -O scripts/catalog-intake/foreground-mask.swift -o <private-dir>/foreground-mask   (macOS 14 or later)
import Foundation
import Vision
import CoreVideo
let args=CommandLine.arguments
guard args.count==3 else { fputs("usage: foreground-mask <image> <out-prefix>\n",stderr); exit(2) }
let handler=VNImageRequestHandler(url:URL(fileURLWithPath:args[1]))
let request=VNGenerateForegroundInstanceMaskRequest()
do { try handler.perform([request]) } catch { fputs("vision error: \(error)\n",stderr); exit(1) }
guard let result=request.results?.first else { fputs("no foreground found\n",stderr); exit(1) }
let buffer:CVPixelBuffer
do { buffer=try result.generateScaledMaskForImage(forInstances:result.allInstances,from:handler) } catch { fputs("mask error: \(error)\n",stderr); exit(1) }
CVPixelBufferLockBaseAddress(buffer,.readOnly)
defer { CVPixelBufferUnlockBaseAddress(buffer,.readOnly) }
let w=CVPixelBufferGetWidth(buffer),h=CVPixelBufferGetHeight(buffer),row=CVPixelBufferGetBytesPerRow(buffer)
guard CVPixelBufferGetPixelFormatType(buffer)==kCVPixelFormatType_OneComponent32Float,let base=CVPixelBufferGetBaseAddress(buffer) else { fputs("unexpected mask format\n",stderr); exit(1) }
var out=[UInt8](repeating:0,count:w*h)
for y in 0..<h { let line=base.advanced(by:y*row).assumingMemoryBound(to:Float32.self); for x in 0..<w { out[y*w+x]=UInt8(max(0,min(255,(line[x]*255).rounded()))) } }
try! Data(out).write(to:URL(fileURLWithPath:args[2]+".mask.raw"))
try! "{\"width\":\(w),\"height\":\(h),\"instances\":\(result.allInstances.count)}".write(to:URL(fileURLWithPath:args[2]+".mask.json"),atomically:true,encoding:.utf8)
print("mask \(w)x\(h) instances \(result.allInstances.count)")
