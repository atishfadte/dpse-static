<template>
  <div>
    <PageBand
      title="Projects & Initiatives"
      subtitle="Initiatives of the Goa CSR Authority"
      :parent="{ label: 'CSR Authority', to: '/csr' }"
    />
    <div class="container">
      <template v-for="group in groups" :key="group.sector">
        <h2>{{ group.sector }}</h2>
        <div class="grid grid-2">
          <article v-for="p in group.projects" :key="p.title" class="card">
            <h3>{{ p.title }}</h3>
            <p>{{ p.text }}</p>
          </article>
        </div>
      </template>

      <h2>Events</h2>
      <div class="prose">
        <p>
          On 14 December 2023, the Goa CSR Authority organised the <strong>Goa CSR Conclave</strong> under the
          Chairmanship of Dr. Pramod Sawant, Hon'ble Chief Minister, with participation from more than 100
          corporate houses, PSUs, Government institutions and the private sector. Within a month of the
          Conclave, contributions were received for causes in education, skill development, entrepreneurship,
          environment, health and energy.
        </p>
        <p>
          The <strong>11th Corporate Social Responsibility Summit and CSR Times Awards 2024</strong> were held
          at Raj Bhavan, Goa on 23 August 2024, organised by CSR Times in association with the Goa CSR
          Authority and attended by over 350 delegates from across the country. CSR projects from Goa selected
          for the awards included those of Lupin Human Welfare, Deltin Foundation, Goa Shipyard Limited, Cipla
          Ltd., Vedanta Sesa Goa, Sesa Community Development Foundation, Deccan Fine Chemicals, Goa State
          Pollution Control Board and Kris Manufacturing Co.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'CSR Projects & Initiatives' })

const groups = [
  {
    sector: 'Health',
    projects: [
      { title: 'Vision for All — Colorcon Asia Pvt Ltd', text: 'Contribution of ₹1.00 crore for eye check-ups of 2.37 lakh school children across the State; 253 free eye surgeries and 1,608 spectacles distributed free of cost — one of the first initiatives of its kind in the country.' },
      { title: 'Power Grid Corporation of India Ltd', text: 'Financial assistance of ₹275.00 lakh for supply of medical equipment for automation in blood banks, 2 Advanced Life Support (ALS) ambulances and 6 Basic Life Support (BLS) ambulances for hospitals in Goa.' },
      { title: 'HUDCO Ltd', text: 'Contribution of ₹249.00 lakh for the purchase of 4 Advanced Cardiac Life Support ambulances to provide emergency care for road accident victims in Goa.' },
      { title: 'Power Finance Corporation', text: 'Financial assistance of ₹399.00 lakh for procurement of medical equipment at Goa Medical College and Hospital, Bambolim.' },
      { title: 'Molbio Diagnostics Pvt Ltd', text: '4 ALS ambulances with medical equipment, 2 hearse vans and ophthalmic equipment amounting to ₹340.00 lakh to enhance healthcare infrastructure across the State.' },
      { title: 'Bright Smiles, Bright Futures — Colgate', text: 'Oral health awareness programme reaching over 1,80,000 students across 907 schools, with dental kits, teacher training and interactive sessions.' },
      { title: 'Dvija Naturals Pvt Ltd & Canara Bank', text: 'Dvija Naturals offered its ayurvedic product Dvija Heal+ at 50% discount for healthcare activities; Canara Bank contributed ₹82,500 towards distribution of 500 medical kits among school students.' },
    ],
  },
  {
    sector: 'Education & Skill Development',
    projects: [
      { title: 'FitnessGram — EduHub Sports Pvt Ltd', text: 'MoU to promote children and youth fitness across schools and colleges through comprehensive fitness assessments; 339 students assessed, funded by Canara Bank. Goa is perhaps the first State in India to assess student fitness levels.' },
      { title: 'Integrated Sports Programme — TENVIC Sports (Shri Anil Kumble)', text: 'Three-year grassroots-level sports training programme providing uniform and consistent training for school children across a wide spectrum of sports.' },
      { title: 'IISc Bengaluru — FSID Partnership', text: 'Partnership for entrepreneurial, translational and transformational research and product development; the flagship "Design Thinking" programme was delivered for State Government officers.' },
      { title: 'Goa Udyamita Yojana — EDII', text: 'The Goa Regional Centre of the Entrepreneurship Development Institute of India promotes entrepreneurship education, training, policy research and incubation support, with Goa CSR Authority and EDC Ltd as nodal agencies.' },
      { title: 'NIMHANS', text: 'MoU supporting the State in stress management, teacher education and life skills as per the National Education Policy 2020.' },
      { title: 'Central Institute of Indian Languages (CIIL)', text: 'MoU to promote Indian languages, including Konkani, through production and improvement of academic resources and collaborative research.' },
      { title: 'Kotak Education Foundation', text: 'Capacity building of school leaders and teachers through instructional and leadership practices integrating key elements of NEP 2020.' },
      { title: 'TT Skill Development Pvt Ltd', text: 'Skill development initiatives in logistics, supply chain management, corporate training, pharma cold-chain management, and travel & tourism.' },
      { title: 'Administrative Staff College of India (ASCI)', text: 'Joint training programmes for government and private-sector clients, in Hyderabad or off-campus in Goa.' },
      { title: 'STEM Labs & Language Labs', text: 'STEM labs at Government Primary School Sankhali and Ramnath Naik Memorial Government High School, Surla; language labs at Government Colleges, Sanquelim and Margao (with Thaliyola Infotech Pvt Ltd).' },
      { title: 'UMEED — RBL Bank', text: 'Distribution of 200 bicycles and school kits to girl students across eight schools in the Bicholim taluka, supporting girl-child education and reducing drop-out rates in rural areas.' },
    ],
  },
  {
    sector: 'Women Empowerment & Livelihood',
    projects: [
      { title: 'SBIF LEAP — SBI Foundation', text: 'Grant of ₹49.00 lakh to set up and operationalise an Innovation and Training Centre for skill training and entrepreneurship development for women and youth of Goa, including flagship programmes for Women Self-Help Groups.' },
      { title: 'State Bank of India — Sewing Machines', text: 'Distribution of 10 sewing machines enabling women to generate sustainable income through tailoring, bags and handicrafts.' },
    ],
  },
  {
    sector: 'Environment & Infrastructure',
    projects: [
      { title: 'AlphaMERS River Clean-up', text: 'River clean-up technology implemented on the lines of the National Mission for Clean Ganga, preventing movement of plastics into the sea and improving the tourism brand value of the State.' },
      { title: 'EV Charging Stations — ATHER Energy Pvt Ltd', text: '10 EV charging stations set up across the State catering to electric two-, three- and four-wheelers.' },
    ],
  },
]
</script>
