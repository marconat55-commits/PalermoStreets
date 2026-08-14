export interface JointPose {
  x: number;
  y: number;
}

export interface RigFrame {
  durationMs: number;
  rootX: number;
  rootY: number;
  joints: Record<string, JointPose>;
  fire?: number;
  hit?: boolean;
  invulnerable?: boolean;
}

export interface RigMotion {
  id: string;
  label: string;
  loop: boolean;
  frames: RigFrame[];
}

const pose = (
  durationMs: number,
  rootX: number,
  rootY: number,
  values: number[],
  extras: Partial<RigFrame> = {},
): RigFrame => {
  const names = ['head', 'neck', 'shoulderL', 'elbowL', 'handL', 'shoulderR', 'elbowR', 'handR', 'hipL', 'kneeL', 'footL', 'hipR', 'kneeR', 'footR'];
  const joints: Record<string, JointPose> = {};
  names.forEach((name, index) => {
    joints[name] = { x: values[index * 2] ?? 0, y: values[index * 2 + 1] ?? 0 };
  });
  return { durationMs, rootX, rootY, joints, ...extras };
};

const guard = [0,-145, 0,-112, -38,-103, -60,-70, -34,-48, 38,-103, 61,-72, 45,-47, -22,-45, -32,8, -40,62, 22,-45, 34,8, 43,62];
const strideA = [2,-143, 0,-111, -38,-101, -54,-71, -31,-48, 38,-101, 58,-70, 44,-47, -21,-44, -49,4, -71,54, 21,-44, 47,5, 70,55];
const strideB = [-2,-141, 0,-109, -36,-99, -58,-67, -45,-44, 36,-99, 53,-68, 29,-45, -20,-43, 13,5, 42,57, 20,-43, -15,4, -43,57];
const punch = [4,-143, 0,-111, -37,-101, -58,-72, -36,-48, 37,-101, 78,-96, 128,-90, -21,-44, -33,8, -41,62, 21,-44, 34,8, 44,62];
const kick = [-2,-139, 0,-107, -38,-98, -56,-66, -34,-45, 38,-98, 58,-68, 39,-46, -20,-42, -28,5, -31,61, 20,-42, 75,-57, 132,-70];
const airborne = [5,-126, 0,-95, -37,-88, -58,-60, -37,-41, 37,-88, 63,-64, 48,-43, -21,-31, -4,4, 22,28, 21,-31, 78,-54, 139,-67];
const upperStart = [-7,-132, 0,-101, -42,-92, -66,-55, -47,-30, 42,-92, 61,-56, 47,-31, -25,-36, -43,6, -52,55, 25,-36, 44,6, 54,55];
const upperImpact = [10,-158, 0,-123, -39,-114, -60,-83, -39,-60, 39,-114, 57,-155, 48,-202, -20,-54, -34,-4, -41,51, 20,-54, 36,-5, 47,51];

export const RIG_MOTIONS: RigMotion[] = [
  { id: 'walk', label: 'Camminata 8', loop: true, frames: [pose(90,0,0,strideA), pose(80,4,-3,guard), pose(90,8,0,strideB), pose(80,12,-3,guard), pose(90,16,0,strideA), pose(80,20,-3,guard), pose(90,24,0,strideB), pose(80,28,-3,guard)] },
  { id: 'combo', label: 'Combo 4 colpi', loop: false, frames: [pose(100,0,0,guard), pose(85,8,0,punch,{hit:true}), pose(90,14,0,guard), pose(85,21,0,punch,{hit:true}), pose(100,28,0,kick,{hit:true}), pose(120,34,0,punch,{hit:true}), pose(160,34,0,guard)] },
  { id: 'flying_kick', label: 'Calcio volante', loop: false, frames: [pose(110,0,0,guard), pose(100,12,-32,upperStart), pose(120,35,-88,airborne,{hit:true}), pose(100,62,-48,kick), pose(150,72,0,guard)] },
  { id: 'super_uppercut', label: 'SUPER uppercut fuoco', loop: false, frames: [pose(150,0,0,guard,{invulnerable:true}), pose(100,18,0,upperStart,{fire:.25,invulnerable:true}), pose(90,54,-28,upperImpact,{fire:.7,hit:true,invulnerable:true}), pose(90,92,-72,upperImpact,{fire:1,hit:true,invulnerable:true}), pose(100,130,-34,punch,{fire:.65,hit:true}), pose(180,150,0,guard,{fire:.2})] },
];
