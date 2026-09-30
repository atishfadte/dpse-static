<template>
  <div>
    <PageBand title="Contact — Goa CSR Authority" :parent="{ label: 'CSR Authority', to: '/csr' }" />
    <div class="container">
      <section class="contact-block">
        <div class="contact-lines">
          <div class="contact-line">
            <span class="contact-ico" aria-hidden="true"><i class="svg-ico fa-solid fa-location-dot"></i></span>
            <h3>Address</h3>
            <p>
              Goa Corporate Social Responsibility Authority,<br />
              Pandit Deendayal Upadhyay Bhavan, Behind Pundalik Devasthan,<br />
              Pundalik Nagar, Alto-Porvorim, Bardez, Goa &ndash; 403521
            </p>
          </div>
          <div class="contact-line">
            <span class="contact-ico" aria-hidden="true"><i class="svg-ico fa-solid fa-phone"></i></span>
            <h3>Phone (Office)</h3>
            <p>
              <a href="tel:+918322417439">+91-832-2417439</a><br />
              <a href="tel:+918322417445">+91-832-2417445</a>
            </p>
          </div>
          <div class="contact-line">
            <span class="contact-ico" aria-hidden="true"><i class="svg-ico fa-solid fa-fax"></i></span>
            <h3>Fax (Office)</h3>
            <p>+91-832-2417437<br />+91-832-2417443</p>
          </div>
          <div class="contact-line">
            <span class="contact-ico" aria-hidden="true"><i class="svg-ico fa-solid fa-envelope"></i></span>
            <h3>Email</h3>
            <p>
              <a href="mailto:goacsra@gmail.com">goacsra@gmail.com</a><br />
              <a href="mailto:dir-dpse.goa@nic.in">dir-dpse.goa@nic.in</a>
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Contact — Goa CSR Authority' })
</script>
