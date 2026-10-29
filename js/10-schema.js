/* ===== SCHEMA METADATA =====
   S: table -> [domain, "col:type,...", "fk_col>parent_table,..."]
   D: table -> [description, "indexes and constraints; separated"]
   TOTAL: row counts shown in the UI (filled from the API) */
const TS = "created_at:ts,updated_at:ts";
const S = {
  users: [
    "Core",
    `id:uuid,email:text,password_hash:text,google_id:text,display_name:text,profile_photo:text,mobile:text,address:text,${TS}`,
    "",
  ],
  pets: [
    "Core",
    `id:uuid,user_id:uuid,name:text,breed:text,dob:date,weight_kg:num,gender:text,photo:text,${TS},local_id:int,pettype:text`,
    "user_id>users",
  ],
  app_info: [
    "Core",
    `id:int,user_id:uuid,version:text,latest_version:text,update_available:int,install_date:int,updated_on:int,device_os:text,${TS}`,
    "user_id>users",
  ],
  health_data: [
    "Health",
    "id:int,user_id:uuid,pet_id:uuid,timestamp:ts,heart_rate:int,temperature_x10:int,spo2:int,step_count:int,bark_angry:int,bark_sad:int,bark_happy:int,standing_count:int,sitting_count:int,lying_count:int,walking_count:int",
    "user_id>users,pet_id>pets",
  ],
  hourly_health_trends: [
    "Health",
    "id:int,user_id:uuid,pet_id:uuid,hour_timestamp:ts,avg_heart_rate:int,avg_temperature_x10:int,avg_spo2:int,total_step_count:int,total_bark_angry:int,total_bark_sad:int,total_bark_happy:int,total_standing:int,total_sitting:int,total_lying:int,total_walking:int",
    "user_id>users,pet_id>pets",
  ],
  daily_step_goals: [
    "Health",
    `id:uuid,user_id:uuid,goal_date:date,step_goal:int,steps_achieved:int,goal_met:bool,${TS},local_id:int`,
    "user_id>users",
  ],
  location_fixes: [
    "Location",
    "id:int,device_id:text,user_id:uuid,pet_id:uuid,latitude:num,longitude:num,accuracy_m:num,source:text,fix_timestamp:ts,created_at:ts",
    "user_id>users,pet_id>pets",
  ],
  devices: [
    "Location",
    `id:uuid,device_id:text,user_id:uuid,pet_id:uuid,label:text,registered_at:ts,is_active:bool,${TS}`,
    "user_id>users,pet_id>pets",
  ],
  gnss_details: [
    "Location",
    "id:int,location_fix_id:int,altitude_m:num,speed:num,heading_deg:num,satellites_tracked:int,satellites_used:int,pvt_flags:int",
    "location_fix_id>location_fixes",
  ],
  serving_cells: [
    "Location",
    "id:int,location_fix_id:int,mcc:int,mnc:int,tac:int,eci:int,pci:int,earfcn:int,rsrp:int,rsrq:int",
    "location_fix_id>location_fixes",
  ],
  neighbor_cells: [
    "Location",
    "id:int,location_fix_id:int,pci:int,earfcn:int,rsrp:int,rsrq:int",
    "location_fix_id>location_fixes",
  ],
  medication: [
    "Care",
    `id:uuid,user_id:uuid,name:text,dosage:text,unit:text,frequency:text,start_date:date,end_date:date,notes:text,is_active:bool,${TS},local_id:int,med_type:int,prescribed_by:text,next_due_date:date,local_reminder_id:int`,
    "user_id>users",
  ],
  vet_visit: [
    "Care",
    `id:uuid,user_id:uuid,vet_name:text,clinic_name:text,visit_date:date,diagnosis:text,next_visit_date:date,notes:text,${TS},local_id:int,report_link:text,local_reminder_id:int`,
    "user_id>users",
  ],
  grooming: [
    "Care",
    `id:uuid,user_id:uuid,grooming_type:text,groomed_at:ts,groomer_name:text,notes:text,next_due_date:date,${TS},local_id:int,local_reminder_id:int`,
    "user_id>users",
  ],
  reminder: [
    "Care",
    `id:uuid,user_id:uuid,title:text,remind_at:ts,repeat_rule:text,is_active:bool,${TS},local_id:int,reminder_type:int,frequency:int,when_ts:int,enabled:int,last_triggered:int,postponed_until_ts:int`,
    "user_id>users",
  ],
  safe_zones: [
    "Safety",
    `id:uuid,user_id:uuid,name:text,latitude:num,longitude:num,radius_m:num,is_active:bool,${TS},local_id:int,shape:text,half_width_meters:num,half_height_meters:num,edge_n:num,edge_s:num,edge_e:num,edge_w:num`,
    "user_id>users",
  ],
  alert_data: [
    "Safety",
    "id:uuid,user_id:uuid,pet_id:uuid,alert_type:text,severity:text,message:text,latitude:num,longitude:num,payload:json,is_read:bool,triggered_at:ts,created_at:ts,local_id:int,description:text",
    "user_id>users,pet_id>pets",
  ],
};
const D = {
  users: [
    "Registered accounts, supporting email/password and Google sign-in.",
    "PK users_new_pkey (id);UNIQUE users_new_email_key (email);UNIQUE users_new_google_id_key (google_id)",
  ],
  pets: [
    "Pet profiles owned by users: breed, birth date, weight and photo.",
    "PK pets_pkey (id);UNIQUE pets_user_local_unique (user_id, local_id);INDEX idx_pets_user_id (user_id);CHECK pets_gender_check (gender)",
  ],
  app_info: [
    "Mobile app install and version information, one row per user.",
    "PK app_info_pkey (id);UNIQUE app_info_user_id_key (user_id)",
  ],
  health_data: [
    "Raw collar sensor readings: heart rate, temperature, SpO₂, steps, barks and posture counts.",
    "PK health_data_pkey (id);INDEX idx_health_data_pet_time (pet_id, timestamp DESC)",
  ],
  hourly_health_trends: [
    "Hourly aggregates of health readings per pet.",
    "PK hourly_health_trends_pkey (id);UNIQUE (pet_id, hour_timestamp);INDEX idx_hourly_trends_pet_time (pet_id, hour_timestamp DESC)",
  ],
  daily_step_goals: [
    "Daily step targets and achievement. goal_met is a generated column.",
    "PK daily_step_goals_pkey (id);UNIQUE daily_step_goals_local_id_unique (local_id)",
  ],
  location_fixes: [
    "Position fixes reported by devices via GNSS, LTE or Wi-Fi. Now linked to the owning user and pet (proposed).",
    "PK location_fixes_pkey (id);INDEX idx_location_device_time (device_id, fix_timestamp DESC);INDEX idx_location_user_time (user_id, fix_timestamp DESC) [proposed];INDEX idx_location_pet_time (pet_id, fix_timestamp DESC) [proposed]",
  ],
  devices: [
    "Device registry mapping each collar's device_id to its owner and pet. Proposed new table.",
    "PK devices_pkey (id);UNIQUE devices_device_id_key (device_id);INDEX idx_devices_user (user_id)",
  ],
  gnss_details: [
    "GNSS metadata for a fix: altitude, speed, heading and satellites.",
    "PK gnss_details_pkey (id);UNIQUE gnss_details_location_fix_id_key (location_fix_id)",
  ],
  serving_cells: [
    "LTE serving-cell measurements captured with a location fix.",
    "PK serving_cells_pkey (id);INDEX idx_serving_location (location_fix_id)",
  ],
  neighbor_cells: [
    "LTE neighbour-cell measurements captured with a location fix.",
    "PK neighbor_cells_pkey (id);INDEX idx_neighbor_location (location_fix_id)",
  ],
  medication: [
    "Medication schedules, dosage and next due dates.",
    "PK medication_pkey (id);UNIQUE medication_local_id_unique (local_id)",
  ],
  vet_visit: [
    "Veterinary visit history, diagnoses and follow-up dates.",
    "PK vet_visit_pkey (id);UNIQUE vet_visit_local_id_unique (local_id)",
  ],
  grooming: [
    "Grooming appointments and next due dates.",
    "PK grooming_pkey (id);UNIQUE grooming_local_id_unique (local_id)",
  ],
  reminder: [
    "User reminders with repeat rules and postponement state.",
    "PK reminder_pkey (id);UNIQUE reminder_local_id_unique (local_id);INDEX idx_reminder_user_id (user_id)",
  ],
  safe_zones: [
    "Geofences (circle or rectangle) used to trigger exit/enter alerts.",
    "PK safe_zones_pkey (id);UNIQUE safe_zones_local_id_unique (local_id);INDEX idx_safe_zones_user_id (user_id)",
  ],
  alert_data: [
    "Generated alerts with severity, location and payload.",
    "PK alert_data_pkey (id);UNIQUE alert_data_local_id_unique (local_id);INDEX idx_alert_data_pet_id, idx_alert_data_triggered, idx_alert_data_user_id;CHECK alert_data_severity_check (info, warning, critical)",
  ],
};
const PROPT = new Set(["devices"]),
  PROPC = { location_fixes: ["user_id", "pet_id"] };
const TRG = new Set([
  "daily_step_goals",
  "grooming",
  "medication",
  "pets",
  "reminder",
  "safe_zones",
  "users",
  "vet_visit",
]);
const TOTAL = Object.fromEntries(Object.keys(S).map((t) => [t, 0])); // filled from the API
const GC = {
  Core: "#5aa2ff",
  Health: "#2dd4bf",
  Location: "#a78bfa",
  Care: "#fbbf24",
  Safety: "#fb7185",
};
const GD = {
  Core: "Accounts, pets and app installs",
  Health: "Sensor readings, trends and step goals",
  Location: "Positions and cellular measurements",
  Care: "Medication, vet, grooming and reminders",
  Safety: "Geofences and alerts",
};
const PT = {
  uuid: "uuid",
  int: "integer",
  num: "double precision",
  bool: "boolean",
  ts: "timestamptz",
  date: "date",
  json: "jsonb",
  text: "text",
};
const HIDE = new Set(["password_hash", "google_id"]);
const cols = (t) =>
  S[t][1].split(",").map((c) => {
    const [n, ty] = c.split(":");
    return { n, ty };
  });
const fks = (t) => (S[t][2] ? S[t][2].split(",").map((x) => x.split(">")) : []);
const refBy = (t) =>
  Object.keys(S).flatMap((o) =>
    fks(o)
      .filter((f) => f[1] === t)
      .map((f) => [o, f[0]]),
  );
const groups = [...new Set(Object.values(S).map((v) => v[0]))];
