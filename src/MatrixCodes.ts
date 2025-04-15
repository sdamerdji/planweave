interface CDBGMatrixCode {
  code: string;
  title: string;
  description: string;
}

const cdbgMatrixCodes: CDBGMatrixCode[] = [
  {
    code: "01",
    title: "Acquisition of Real Property",
    description:
      "Acquisition of real property that will be developed for a public purpose. Use code 01 if CDBG funds will be used ONLY for the acquisition of property. This code is frequently used for the acquisition of property on which a public facility, public improvement or housing will be constructed using other funds.",
  },
  {
    code: "02",
    title: "Disposition of Real Property",
    description:
      "Costs related to the sale, lease, or donation of real property acquired with CDBG funds or under urban renewal. Eligible costs would include the costs incidental to disposing of the property, such as preparation of legal documents, fees paid for surveys, transfer taxes, and other costs involved in the transfer of ownership of the CDBG-assisted property.",
  },
  {
    code: "03A",
    title: "Senior Centers",
    description:
      "Acquisition, construction, or rehabilitation of facilities (except permanent housing) for seniors. May be used for a facility serving both the elderly and persons with disabilities, provided it is not intended primarily to serve persons with disabilities.",
  },
  {
    code: "03B",
    title: "Facilities for Persons with Disabilities",
    description:
      "Acquisition, construction, or rehabilitation of centers, group homes, and other facilities (except permanent housing) for persons with disabilities. May be used for a facility serving both persons with disabilities and the elderly, provided it is not intended primarily to serve the elderly.",
  },
  {
    code: "03C",
    title: "Homeless Facilities (not operating costs)",
    description:
      "Acquisition, construction, conversion of buildings, or rehabilitation of temporary shelters and transitional housing for the homeless, including victims of domestic violence, dating violence, sexual assault or stalking, disaster victims, runaway children, drug offenders, and parolees.",
  },
  {
    code: "03D",
    title: "Youth Centers",
    description:
      "Acquisition, construction, or rehabilitation of facilities intended primarily for young people age 13 to 19. These include playground and recreational facilities that are part of a youth center.",
  },
  {
    code: "03E",
    title: "Neighborhood Facilities",
    description:
      "Acquisition, construction, or rehabilitation of facilities that are principally designed to serve a neighborhood and that will be used for social services or for multiple purposes (including recreation). Such facilities may include libraries and community centers.",
  },
  {
    code: "03F",
    title: "Parks, Recreational Facilities",
    description:
      "Development of open space areas or facilities intended primarily for recreational use.",
  },
  {
    code: "03G",
    title: "Parking Facilities",
    description:
      "Acquisition, construction, or rehabilitation of parking lots and parking garages. Use 03G if rehabilitation of a public facility or street improvement is a small part of an activity to improve a parking facility.",
  },
  {
    code: "03H",
    title: "Solid Waste Disposal Improvements",
    description:
      "Acquisition, construction or rehabilitation of solid waste disposal facilities. The eligible costs can also include equipment, such as bulldozers, used exclusively at the facility.",
  },
  {
    code: "03I",
    title: "Flood Drainage Improvements",
    description:
      "Acquisition, construction, or rehabilitation of flood drainage facilities, such as retention ponds, catch basins, streambank erosion controls, channelization of streambeds, or dams.",
  },
  {
    code: "03J",
    title: "Water/Sewer Improvements",
    description:
      "Installation or replacement of water lines, sanitary sewers, storm sewers, and fire hydrants. Costs of street repairs (usually repaving) made necessary by water/sewer improvement activities are included under 03J.",
  },
  {
    code: "03K",
    title: "Street Improvements",
    description:
      "Installation or repair of streets, street drains, storm drains, curbs and gutters, tunnels, bridges, and traffic lights/signs.",
  },
  {
    code: "03L",
    title: "Sidewalks",
    description:
      "Improvements to sidewalks. Also use 03L for sidewalk improvements that include the installation of trash receptacles, lighting, benches, and trees.",
  },
  {
    code: "03M",
    title: "Child Care Centers",
    description:
      "Acquisition, construction, or rehabilitation of facilities intended primarily for children age 12 and under. Examples are daycare centers and Head Start preschool centers.",
  },
  {
    code: "03N",
    title: "Tree Planting",
    description:
      'Activities limited to tree planting (sometimes referred to as "beautification").',
  },
  {
    code: "03O",
    title: "Fire Stations/Equipment",
    description:
      "Acquisition, construction, or rehabilitation of fire stations and/or the purchase of fire trucks and emergency rescue equipment.",
  },
  {
    code: "03P",
    title: "Health Facilities",
    description:
      "Acquisition, construction, or rehabilitation of physical or mental health facilities. Examples of such facilities include neighborhood clinics, hospitals, nursing homes, and convalescent homes.",
  },
  {
    code: "03Q",
    title: "Abused and Neglected Children Facilities",
    description:
      "Acquisition, construction, or rehabilitation of daycare centers, treatment facilities, or temporary housing for abused and neglected children.",
  },
  {
    code: "03R",
    title: "Asbestos Removal",
    description:
      "Rehabilitation of any public facility undertaken primarily to remove asbestos.",
  },
  {
    code: "03S",
    title: "Facilities for AIDS Patients (not operating costs)",
    description:
      "Acquisition, construction, or rehabilitation of facilities for the treatment or temporary housing of people who are HIV positive or who have AIDS.",
  },
  {
    code: "03T",
    title: "Homeless/AIDS Patients Programs",
    description:
      "Costs associated with the operation of programs for the homeless or for AIDS patients, such as staff costs, utilities, maintenance, and insurance.",
  },
  {
    code: "03Z",
    title: "Other Public Improvements Not Listed in 03A-03S",
    description:
      "Only use this code when an activity does not fall under a more specific 03A – 03S matrix code.",
  },
  {
    code: "04",
    title: "Clearance and Demolition",
    description:
      "Clearance or demolition of buildings/improvements, or the movement of buildings to other sites.",
  },
  {
    code: "04A",
    title: "Cleanup of Contaminated Sites",
    description:
      "Activities undertaken primarily to clean toxic/environmental waste or contamination from a site.",
  },
  {
    code: "05A",
    title: "Senior Services",
    description:
      "Services for the elderly. 05A may be used for an activity that serves both the elderly and persons with disabilities provided it is intended primarily to serve elderly.",
  },
  {
    code: "05B",
    title: "Services for Persons with Disabilities",
    description:
      "Services for the persons with disabilities, regardless of age.",
  },
  {
    code: "05C",
    title: "Legal Services",
    description:
      "Services providing legal aid to low- and moderate-income (LMI) persons.",
  },
  {
    code: "05D",
    title: "Youth Services",
    description:
      "Services for young people age 13 to 19. For example, recreational services limited to teenagers and teen counseling programs.",
  },
  {
    code: "05E",
    title: "Transportation Services",
    description: "General transportation services.",
  },
  {
    code: "05F",
    title: "Substance Abuse Services",
    description:
      "Substance abuse recovery programs and substance abuse prevention/education activities.",
  },
  {
    code: "05G",
    title:
      "Services for victims of domestic violence, dating violence, sexual assault or stalking",
    description:
      "Services for victims of domestic violence, dating violence, sexual assault or stalking.",
  },
  {
    code: "05H",
    title: "Employment Training",
    description:
      'Assistance to increase self-sufficiency, including literacy, independent living skills, resume writing, job coaching, "how to get and keep a job" training, or training students in a particular field on skill when there is no tie to a specific position or business.',
  },
  {
    code: "05I",
    title: "Crime Awareness/Prevention",
    description:
      "Promotion of crime awareness and prevention, including crime prevention education programs, community-oriented policing programs above and beyond normal staffing levels, installation of security cameras, and paying for security guards.",
  },
  {
    code: "05J",
    title: "Fair Housing Activities (subject to Public Services cap)",
    description:
      "Fair housing services (e.g. counseling on housing discrimination) as public services.",
  },
  {
    code: "05K",
    title: "Tenant/Landlord Counseling",
    description:
      "Counseling to help prevent or settle disputes between tenants and landlords.",
  },
  {
    code: "05L",
    title: "Child Care Services",
    description:
      "Services that will benefit children (generally under age 13), including parenting skills classes.",
  },
  {
    code: "05M",
    title: "Health Services",
    description:
      "Services addressing the physical health needs of residents of the community.",
  },
  {
    code: "05N",
    title: "Abused and Neglected Children Services",
    description:
      "Daycare and other services exclusively for abused and neglected children.",
  },
  {
    code: "05O",
    title: "Mental Health Services",
    description:
      "Services addressing the mental health needs of residents of the community.",
  },
  {
    code: "05P",
    title: "Screening for Lead Poisoning",
    description:
      "Activities undertaken primarily to provide screening for lead poisoning.",
  },
  {
    code: "05Q",
    title: "Subsistence Payments",
    description:
      "One-time or short-term (no more than three months) emergency payments on behalf of individuals or families, generally for the purpose of preventing homelessness.",
  },
  {
    code: "05R",
    title:
      "Homebuyer Downpayment Assistance - Excluding Housing Counseling under 24 CFR 5.100",
    description:
      "Homebuyer downpayment assistance provided as a PUBLIC SERVICE.",
  },
  {
    code: "05S",
    title: "Rental Housing Subsidies",
    description:
      "Tenant subsidies exclusively for rental payments for more than three months.",
  },
  {
    code: "05T",
    title: "Security Deposits",
    description:
      "Tenant subsidies exclusively for payment of security deposits.",
  },
  {
    code: "05U",
    title: "Housing Counseling only, under 24 CFR 5.100",
    description:
      "Housing counseling, under 24 CFR 5.100, for renters, homeowners, and/or potential new homebuyers that is provided as an independent public service (i.e., not as part of another eligible housing activity).",
  },
  {
    code: "05V",
    title: "Neighborhood Cleanups",
    description:
      "One-time or short-term efforts to remove trash and debris from neighborhoods. Examples of legitimate uses of this code include neighborhood cleanup campaigns and graffiti removal.",
  },
  {
    code: "05W",
    title: "Food Banks",
    description:
      "Costs associated with the operation of food banks, community kitchens, and food pantries, such as staff costs, supplies, utilities, maintenance, and insurance.",
  },
  {
    code: "05X",
    title: "Housing Information and Referral Services",
    description:
      "An activity that provides housing information, education, and referral services, or general budget/financial counseling that does not meet the 24 CFR 5.100 definition of Housing Counseling.",
  },
  {
    code: "05Y",
    title:
      "Housing Counseling under 24 CFR 5.100 Supporting Homebuyer Downpayment Assistance (05R)",
    description:
      "Housing Counseling, under 24 CFR 5.100, that is provided to in conjunction with homebuyer downpayment assistance (05R) as a public service.",
  },
  {
    code: "05Z",
    title: "Other Public Services Not Listed in 03T and 05A-05Y",
    description:
      "Only use this matrix code when an activity does not fall under a more specific 05A-05Y code.",
  },
  {
    code: "06",
    title: "Interim Assistance",
    description:
      "Only for activities undertaken either to make limited improvements (e.g., repair of streets, sidewalks, or public buildings) intended solely to arrest further deterioration of physically deteriorated areas prior to making permanent improvements, or to alleviate emergency conditions threatening public health and safety.",
  },
  {
    code: "07",
    title: "Urban Renewal Completion",
    description:
      "Completion of Urban Renewal projects funded under Title I of the Housing Act of 1949.",
  },
  {
    code: "08",
    title: "Relocation",
    description:
      "Relocation payments and other assistance for permanently or temporarily displaced individuals, families, businesses, non-profit organizations, and farms.",
  },
  {
    code: "09",
    title: "Loss of Rental Income",
    description:
      "Payments to owners of housing for loss of rental income due to temporarily holding rental units for persons displaced by CDBG-assisted activities.",
  },
  {
    code: "11",
    title: "Privately Owned Utilities",
    description:
      "Acquisition, reconstruction, rehabilitation, or installation of distribution lines and facilities of regulated, privately owned utilities. This includes placing new or existing distribution lines/facilities underground.",
  },
  {
    code: "12",
    title: "Construction of Housing",
    description:
      "Construction of housing with CDBG funds must either be: carried out by CBDOs, in accordance with the regulations at 24 CFR 570.204(a); in accordance with 42 USC 5305(a)(15); or last resort housing under the provisions of the Uniform Act, 42 USC Part 49.",
  },
  {
    code: "13A",
    title:
      "Housing Counseling, under 24 CFR 5.100, for Homeownership Assistance (13B)",
    description:
      "Housing Counseling, under 24 CFR 5.100, when provided in conjunction with direct homeownership assistance 13B. Report housing counseling under matrix code 13A as a separate activity.",
  },
  {
    code: "13B",
    title:
      "Homeownership Assistance - excluding Housing Counseling under 24 CFR 5.100",
    description:
      "CDBG funds may be used to provide direct homeownership assistance under 24 CFR 570.201(n) and Section 105(a)(24) of the HCDA under the low- and moderate-income housing national objective.",
  },
  {
    code: "14A",
    title: "Rehabilitation: Single-Unit Residential",
    description: "Rehabilitation of privately owned, single-unit homes.",
  },
  {
    code: "14B",
    title: "Rehabilitation: Multi-Unit Residential",
    description:
      "Rehabilitation of privately owned buildings with two or more permanent residential units.",
  },
  {
    code: "14C",
    title: "Rehabilitation: Public Housing Modernization",
    description:
      "Rehabilitation of housing units owned/operated by a public housing authority (PHA).",
  },
  {
    code: "14D",
    title: "Rehabilitation: Other Publicly Owned Residential Buildings",
    description:
      "Rehabilitation of permanent housing owned by a public entity other than a PHA.",
  },
  {
    code: "14E",
    title: "Rehabilitation: Publicly or Privately Owned Commercial/Industrial",
    description:
      "Rehabilitation of commercial/industrial property. If the property is privately owned, CDBG-funded rehab is limited to exterior improvements and correction of code violations.",
  },
  {
    code: "14F",
    title: "Rehabilitation: Energy Efficiency Improvements",
    description:
      "Housing rehabilitation with the sole purpose of improving energy efficiency (e.g., a weatherization program).",
  },
  {
    code: "14G",
    title: "Rehabilitation: Acquisition",
    description:
      "Acquisition of property to be rehabilitated for housing. 14G may be used whether CDBG funds will pay only for acquisition or for both acquisition and rehabilitation.",
  },
  {
    code: "14H",
    title: "Rehabilitation: Administration",
    description:
      "All delivery costs (including staff, other direct costs, and service costs) directly related to carrying out housing rehabilitation activities.",
  },
  {
    code: "14I",
    title: "Lead-Based Paint/Lead Hazards Testing/Abatement",
    description:
      "Housing rehabilitation activities with the primary goal of evaluating housing units for lead-paint hazards and reducing lead-based paint/lead hazards in units.",
  },
  {
    code: "14J",
    title:
      "Housing Services - Excluding Housing Counseling, under 24 CFR 5.100",
    description:
      "Housing services, except Housing Counseling, under 24 CFR 5.100, in support of the HOME Program, eligible under 24 CFR 570.201(k).",
  },
  {
    code: "14K",
    title:
      "Housing Counseling, under 24 CFR 5.100, Supporting HOME Program Housing Activities",
    description:
      "Housing Counseling, under 24 CFR 5.100, in support of a HOME- funded housing assistance program.",
  },
  {
    code: "14L",
    title:
      "Housing Counseling, under 24 CFR 5.100, in Conjunction with CDBG-assisted Housing Rehabilitation",
    description:
      "Housing Counseling, under 24 CFR 5.100, in support of CDBG assisted housing rehabilitation activities, including 14A-14D, 14F-14I, and 16A.",
  },
  {
    code: "15",
    title: "Code Enforcement",
    description:
      "Salaries and overhead costs associated with property inspections and follow-up actions (such as legal proceedings) directly related to the enforcement (not correction) of state and local codes.",
  },
  {
    code: "16A",
    title: "Residential Historic Preservation",
    description: "Rehabilitation of historic buildings for residential use.",
  },
  {
    code: "16B",
    title: "Non-Residential Historic Preservation",
    description:
      "Rehabilitation of historic buildings for non-residential use. Examples include the renovation of an historic building for use as a neighborhood facility, as a museum, or by an historic preservation society.",
  },
  {
    code: "17A",
    title: "Commercial/Industrial: Acquisition/Disposition",
    description:
      "Land acquisition, clearance of structures, or assembling land for the purpose of creating industrial parks or promoting commercial/industrial development.",
  },
  {
    code: "17B",
    title: "Commercial/Industrial: Infrastructure Development",
    description:
      "Street, water, parking, rail transport, or other improvements to commercial/industrial sites.",
  },
  {
    code: "17C",
    title:
      "Commercial/Industrial: Building Acquisition, Construction, Rehabilitation",
    description:
      "Acquisition, construction, or rehabilitation of commercial/industrial buildings.",
  },
  {
    code: "17D",
    title: "Commercial/Industrial: Other Improvements",
    description:
      "Commercial/industrial improvements not covered by other 17* codes.",
  },
  {
    code: "18A",
    title:
      "Economic Development Direct Financial Assistance to For-Profit Business",
    description:
      "Financial assistance to private for-profit businesses to (for example) acquire property, clear structures, build, expand or rehabilitate a building, purchase equipment, or provide operating capital.",
  },
  {
    code: "18B",
    title: "Economic Development: Technical Assistance",
    description:
      "Technical assistance to for-profit businesses, including workshops, assistance in developing business plans, marketing, and referrals to lenders or technical resources.",
  },
  {
    code: "18C",
    title: "Economic Development: Microenterprise Assistance",
    description:
      "Financial assistance, technical assistance, or general support services to owners and developers of microenterprises. A microenterprise is a business with five or fewer employees, including the owner(s).",
  },
  {
    code: "19C",
    title: "CDBG Non-Profit Organization Capacity Building",
    description:
      "Activities specifically designed to increase the capacity of non-profit organizations to carry out specific CDBG eligible neighborhood revitalization or economic development activities.",
  },
  {
    code: "19E",
    title: "CDBG Operation and Repair of Foreclosed Property",
    description:
      "Activities to prevent the abandonment and deterioration of housing acquired through tax foreclosure. These include making essential repairs to the housing and paying operating expenses to maintain its habitability.",
  },
  {
    code: "19F",
    title: "Planned Repayments of Section 108 Loans",
    description:
      "Planned payments of principal due on Section 108 loans (including prepayment or defeasance of Section 108 loans).",
  },
  {
    code: "19G",
    title: "Unplanned Repayments of Section 108 Loans",
    description:
      "Unplanned payments of principal due on Section 108 loans (including prepayment or defeasance of Section 108 loans).",
  },
  {
    code: "19H",
    title: "State CDBG Technical Assistance to Grantees",
    description:
      "Use this code to indicate State CDBG technical assistance to grantees. This code should be used only for states.",
  },
  {
    code: "20",
    title: "Planning",
    description:
      "Program planning activities, including the development of comprehensive plans, community development plans, energy strategies, capacity building, environmental studies, area neighborhood plans, and functional plans.",
  },
  {
    code: "20A",
    title: "State Planning-Only Activities",
    description:
      "Program planning activities for when states award grants to units of general local government in which planning is the only activity, or in which planning activities are unrelated to any other activity funded as part of the grant.",
  },
  {
    code: "21A",
    title: "General Program Administration",
    description:
      "Overall program administration, including (but not limited to) salaries, wages, and related costs of grantee staff or others engaged in program management, monitoring, and evaluation.",
  },
  {
    code: "21B",
    title: "Indirect Costs",
    description:
      "Costs charged as general program administration under an indirect cost allocation plan.",
  },
  {
    code: "21C",
    title: "Public Information",
    description:
      "Providing information and other resources to residents and citizen organizations participating in the planning, implementation, or assessment of CDBG-assisted activities.",
  },
  {
    code: "21D",
    title: "Fair Housing Activities (subject to admin cap)",
    description:
      "Fair housing activities carried out as part of general program administration rather than as a public service.",
  },
  {
    code: "21E",
    title: "Submission of Applications for Federal Programs",
    description:
      "Preparation of (1) documents that must be submitted to HUD to receive CDBG funds or (2) applications to other federal programs for community development assistance.",
  },
  {
    code: "21H",
    title: "CDBG Funding of HOME Administrative Costs",
    description: "CDBG funding of administrative costs for the HOME Program.",
  },
  {
    code: "21I",
    title: "CDBG Funding of HOME CHDO Operating Expenses",
    description: "CDBG funding of CHDO operating expenses for HOME Program.",
  },
  {
    code: "21J",
    title: "State Program Administration",
    description:
      "State program administration, including (but not limited to) salaries, wages, and related costs required for overall program management, coordination, monitoring, reporting, and evaluation.",
  },
  {
    code: "23",
    title: "Tornado Shelters Serving Private Mobile Home Parks",
    description:
      "Construction or improvement of tornado-safe shelters for residents of manufactured housing parks and the provision of assistance to nonprofit and for-profit entities to do so.",
  },
  {
    code: "24A",
    title: "Payment of Interest on Section 108 Loans",
    description: "Payment of interest on Section 108 loans.",
  },
  {
    code: "24B",
    title: "Payment of Costs of Section 108 Financing",
    description:
      "Payment of issuance, underwriting, servicing, trust administration and other costs associated with private sector financing of Section 108 loans and payment of fees charged by HUD.",
  },
  {
    code: "24C",
    title: "Debt Service Reserve",
    description:
      "Establishment of debt service reserves as additional security for repayment of Section 108 loans.",
  },
];

export default cdbgMatrixCodes;
